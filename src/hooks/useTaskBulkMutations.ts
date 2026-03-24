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
  skipValidation?: boolean; // Skip validation for internal system operations (e.g., delete cascades)
}

export const useTaskBulkMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bulkDeleteTasks = useMutation({
    mutationFn: async ({ taskIds, options }: { taskIds: string[], options?: BulkDeleteOptions }) => {
      if (!user || taskIds.length === 0) return [];

      console.log('🗑️ Performing bulk delete for', taskIds.length, 'tasks');
      
      // Use a single delete operation with IN clause
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .in('id', taskIds)
        .select('id');

      if (error) {
        console.error('Bulk delete error:', error);
        throw error;
      }

      console.log('✅ Bulk delete completed for', data?.length || 0, 'tasks');
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
      console.log('🚀 Performing SINGLE-BATCH hierarchy update for', updates.length, 'tasks');
      
      // For large updates (>10), try the edge function first for atomic execution
      if (updates.length > 10) {
        try {
          console.log('📦 Using edge function for atomic batch update...');
          const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('bulk-update-hierarchies', {
            body: { updates, projectId }
          });
          
          if (!edgeError && edgeResult?.success) {
            console.log(`✅ Edge function batch update completed: ${updates.length} tasks in ~${Date.now() - timestamp}ms`);
            return updates.map(u => ({ id: u.id }));
          }
          
          if (edgeError) {
            console.warn('⚠️ Edge function failed, falling back to parallel updates:', edgeError);
          }
        } catch (err) {
          console.warn('⚠️ Edge function unavailable, using parallel update fallback:', err);
        }
      }
      
      // Fallback: Use atomic RPC function for safe hierarchy updates
      console.log('📋 Using atomic RPC fallback for hierarchy changes');
      
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
      // Simplified - no more echo prevention needed
      
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

      console.log('🔄 Performing bulk predecessor update for', updates.length, 'tasks', options?.skipValidation ? '(validation skipped)' : '');

      // ALWAYS fetch tasks - needed for self-reference filter even when skipping validation
      const { data: allTasksData, error: fetchError } = await supabase
        .from('project_schedule_tasks')
        .select('id, hierarchy_number')
        .eq('project_id', projectId);

      if (fetchError) throw fetchError;
      const allTasks = allTasksData || [];

      // ALWAYS filter out self-references - this is a safety net that runs even with skipValidation
      const { parsePredecessorString } = await import('@/utils/predecessorValidation');
      const sanitizedUpdates = updates.map(update => {
        const task = allTasks.find(t => t.id === update.id);
        const taskHierarchy = task?.hierarchy_number;
        
        if (!taskHierarchy || !update.predecessor) return update;
        
        const predecessorArray = Array.isArray(update.predecessor) 
          ? update.predecessor 
          : [update.predecessor];
        
        // Filter out any self-references
        const filteredPredecessors = predecessorArray.filter(pred => {
          const parsed = parsePredecessorString(pred);
          return parsed?.taskId !== taskHierarchy;
        });
        
        if (filteredPredecessors.length !== predecessorArray.length) {
          console.warn(`🛡️ Filtered self-reference for task ${taskHierarchy}`);
        }
        
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
      
      // Use batch updates for better performance (use sanitizedUpdates which has self-refs filtered)
      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming the database
      
      for (let i = 0; i < sanitizedUpdates.length; i += batchSize) {
        const batch = sanitizedUpdates.slice(i, i + batchSize);
        const batchPromises = batch.map(update => {
          // Always store predecessor as JSON array for consistency
          return supabase
            .from('project_schedule_tasks')
            .update({ predecessor: update.predecessor })
            .eq('id', update.id)
            .select('id');
        });
        
        const batchResults = await Promise.all(batchPromises);
        for (const result of batchResults) {
          if (result.error) {
            console.error('Bulk predecessor update error:', result.error);
            throw result.error;
          }
          if (result.data) results.push(...result.data);
        }
      }

      console.log('✅ Bulk predecessor update completed for', results.length, 'tasks');
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