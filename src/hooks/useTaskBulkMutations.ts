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

      console.log('🚀 Performing PARALLEL batch hierarchy update for', updates.length, 'tasks');
      
      // Two-phase approach using PARALLEL updates to avoid unique constraint violations
      // This reduces 260 sequential calls to 2 batches of parallel calls
      
      const timestamp = Date.now();
      
      // PHASE 1: Move all to temporary hierarchies in PARALLEL
      console.log('📋 Phase 1: Moving to temporary hierarchies (parallel)');
      const tempPromises = updates.map((update, index) => 
        supabase
          .from('project_schedule_tasks')
          .update({ 
            hierarchy_number: `TEMP-${index}-${timestamp}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
      );
      
      const tempResults = await Promise.all(tempPromises);
      const tempError = tempResults.find(r => r.error);
      if (tempError?.error) {
        console.error('❌ Phase 1 parallel update failed:', tempError.error);
        throw tempError.error;
      }
      
      // PHASE 2: Move all to final hierarchies in PARALLEL
      console.log('📋 Phase 2: Moving to final hierarchies (parallel)');
      const finalPromises = updates.map(update => 
        supabase
          .from('project_schedule_tasks')
          .update({ 
            hierarchy_number: update.hierarchy_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
          .select('id')
      );
      
      const finalResults = await Promise.all(finalPromises);
      const finalError = finalResults.find(r => r.error);
      if (finalError?.error) {
        console.error('❌ Phase 2 parallel update failed:', finalError.error);
        throw finalError.error;
      }

      const data = finalResults.flatMap(r => r.data || []);
      console.log(`✅ Parallel batch update completed: ${updates.length} tasks in ~${Date.now() - timestamp}ms`);
      return data;
    },
    onSuccess: async (data, variables) => {
      // Add all updated tasks to pending set to ignore realtime echoes  
      const { addPendingUpdate } = await import('@/hooks/useProjectTasks');
      variables.updates.forEach(update => addPendingUpdate(update.id));
      
      if (!variables.options?.suppressInvalidate) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('Bulk hierarchy update failed:', error);
      toast({ title: "Error", description: 'Failed to update task positions', variant: "destructive" });
    },
  });

  const bulkUpdatePredecessors = useMutation({
    mutationFn: async ({ updates, options }: { updates: BulkPredecessorUpdate[], options?: BulkUpdateOptions }) => {
      if (!user || updates.length === 0) return [];

      console.log('🔄 Performing bulk predecessor update for', updates.length, 'tasks');

      // Get all tasks for validation
      const { data: allTasks, error: fetchError } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId);

      if (fetchError) throw fetchError;
      if (!allTasks) throw new Error('Failed to fetch tasks for validation');

      // Validate all predecessor updates before applying any
      const invalidUpdates: string[] = [];
      for (const update of updates) {
        const predecessorArray = Array.isArray(update.predecessor) 
          ? update.predecessor 
          : update.predecessor ? [update.predecessor] : [];
        
        const { validatePredecessors } = await import('@/utils/predecessorValidation');
        const validation = validatePredecessors(update.id, predecessorArray, allTasks as ProjectTask[]);
        
        if (!validation.isValid) {
          const task = allTasks.find(t => t.id === update.id);
          invalidUpdates.push(`${task?.hierarchy_number || update.id}: ${validation.errors[0]}`);
        }
      }

      if (invalidUpdates.length > 0) {
        throw new Error(`Invalid predecessor updates:\n${invalidUpdates.join('\n')}`);
      }
      
      // Use batch updates for better performance
      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming the database
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
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