import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ProjectTask } from "./useProjectTasks";
import { useToast } from "@/hooks/use-toast";

interface BulkHierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

interface BulkPredecessorUpdate {
  id: string;
  predecessor: string[] | string | null;
}

interface BulkDeleteOptions {
  suppressInvalidate?: boolean;
}

interface BulkUpdateOptions {
  suppressInvalidate?: boolean;
  skipValidation?: boolean;
}

export const useTaskBulkMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bulkDeleteTasks = useMutation({
    mutationFn: async ({ taskIds, options }: { taskIds: string[], options?: BulkDeleteOptions }) => {
      if (!user || taskIds.length === 0) return [];

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .in('id', taskIds)
        .select('id');

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data, variables) => {
      if (!variables.options?.suppressInvalidate) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('Bulk delete failed:', error);
    },
  });

  const bulkUpdateHierarchies = useMutation({
    mutationFn: async ({ updates, originalTasks, options, ordered }: { 
      updates: BulkHierarchyUpdate[], 
      originalTasks?: ProjectTask[], 
      options?: BulkUpdateOptions,
      ordered?: boolean 
    }) => {
      if (!user || updates.length === 0) return [];

      const timestamp = Date.now();
      
      // Always use the atomic RPC function (collision-safe two-phase update)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('bulk_update_hierarchy_numbers', {
        updates: updates as any
      });
      
      if (rpcError) {
        console.error('❌ Atomic RPC update failed:', rpcError);
        throw rpcError;
      }
      
      console.log(`✅ Atomic RPC update completed: ${rpcResult}/${updates.length} tasks in ~${Date.now() - timestamp}ms`);
      return updates.map(u => ({ id: u.id }));
    },
    onSuccess: async (data, variables) => {
      if (!variables.options?.suppressInvalidate) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error: any) => {
      console.error('Bulk hierarchy update failed:', error);
      const message = error?.message || 'Failed to update task positions';
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const bulkUpdatePredecessors = useMutation({
    mutationFn: async ({ updates, options }: { updates: BulkPredecessorUpdate[], options?: BulkUpdateOptions }) => {
      if (!user || updates.length === 0) return [];

      // Fetch tasks for self-reference filtering
      const { data: allTasksData, error: fetchError } = await supabase
        .from('project_schedule_tasks')
        .select('id, hierarchy_number')
        .eq('project_id', projectId);

      if (fetchError) throw fetchError;
      const allTasks = allTasksData || [];

      // Filter out self-references
      const { parsePredecessorString } = await import('@/utils/predecessorValidation');
      const sanitizedUpdates = updates.map(update => {
        const task = allTasks.find(t => t.id === update.id);
        const taskHierarchy = task?.hierarchy_number;
        
        if (!taskHierarchy || !update.predecessor) return update;
        
        const predecessorArray = Array.isArray(update.predecessor) 
          ? update.predecessor 
          : [update.predecessor];
        
        const filteredPredecessors = predecessorArray.filter(pred => {
          const parsed = parsePredecessorString(pred);
          return parsed?.taskId !== taskHierarchy;
        });
        
        return { ...update, predecessor: filteredPredecessors.length > 0 ? filteredPredecessors : null };
      });

      // Full validation (only if not skipping)
      if (!options?.skipValidation) {
        const { validatePredecessors } = await import('@/utils/predecessorValidation');
        const invalidUpdates: string[] = [];
        
        for (const update of sanitizedUpdates) {
          const predecessorArray = Array.isArray(update.predecessor) 
            ? update.predecessor 
            : update.predecessor ? [update.predecessor] : [];
          
          const validation = validatePredecessors(update.id, predecessorArray, allTasks as ProjectTask[]);
          
          if (!validation.isValid) {
            const task = allTasks.find(t => t.id === update.id);
            invalidUpdates.push(`${task?.hierarchy_number || update.id}: ${validation.errors[0]}`);
          }
        }

        if (invalidUpdates.length > 0) {
          throw new Error(`Invalid predecessor updates:\n${invalidUpdates.join('\n')}`);
        }
      }
      
      // Batch updates
      const results = [];
      const batchSize = 10;
      
      for (let i = 0; i < sanitizedUpdates.length; i += batchSize) {
        const batch = sanitizedUpdates.slice(i, i + batchSize);
        const batchPromises = batch.map(update =>
          supabase
            .from('project_schedule_tasks')
            .update({ predecessor: update.predecessor })
            .eq('id', update.id)
            .select('id')
        );
        
        const batchResults = await Promise.all(batchPromises);
        for (const result of batchResults) {
          if (result.error) throw result.error;
          if (result.data) results.push(...result.data);
        }
      }

      return results;
    },
    onSuccess: (data, variables) => {
      if (!variables.options?.suppressInvalidate) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('Bulk predecessor update failed:', error);
    },
  });

  return {
    bulkDeleteTasks,
    bulkUpdateHierarchies,
    bulkUpdatePredecessors,
  };
};
