import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ProjectTask } from "./useProjectTasks";

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
    mutationFn: async ({ updates, options }: { updates: BulkHierarchyUpdate[], options?: BulkUpdateOptions }) => {
      if (!user || updates.length === 0) return [];

      console.log('🔄 Performing smart hierarchy update for', updates.length, 'tasks');
      
      // Get current tasks from cache to compare directions
      const currentTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
      
      // Analyze update directions: increment (1 -> 2) vs decrement (3 -> 2)
      const incrementUpdates: BulkHierarchyUpdate[] = [];
      const decrementUpdates: BulkHierarchyUpdate[] = [];
      
      updates.forEach(update => {
        const currentTask = currentTasks.find(t => t.id === update.id);
        if (currentTask && currentTask.hierarchy_number) {
          const currentNum = parseFloat(currentTask.hierarchy_number);
          const targetNum = parseFloat(update.hierarchy_number);
          
          if (targetNum > currentNum) {
            incrementUpdates.push(update);
          } else {
            decrementUpdates.push(update);
          }
        } else {
          // If we can't find current task, treat as increment (safer)
          incrementUpdates.push(update);
        }
      });
      
      console.log(`📊 Direction analysis: ${incrementUpdates.length} increments, ${decrementUpdates.length} decrements`);
      
      // Sort increments descending (higher numbers first to clear the way)
      const sortedIncrements = incrementUpdates.sort((a, b) => {
        return b.hierarchy_number.localeCompare(a.hierarchy_number, undefined, { numeric: true });
      });
      
      // Sort decrements ascending (lower numbers first - natural renumbering order)
      const sortedDecrements = decrementUpdates.sort((a, b) => {
        return a.hierarchy_number.localeCompare(b.hierarchy_number, undefined, { numeric: true });
      });
      
      // Execute in safe order: increments first (desc), then decrements (asc)
      const finalOrder = [...sortedIncrements, ...sortedDecrements];
      
      console.log('📊 Safe update order:', finalOrder.map(u => `${u.id}: ${u.hierarchy_number}`));
      
      const results = [];
      
      // Process updates one by one to avoid unique constraint violations
      for (const update of finalOrder) {
        console.log(`🔄 Updating task ${update.id} to hierarchy ${update.hierarchy_number}`);
        
        const { data, error } = await supabase
          .from('project_schedule_tasks')
          .update({ hierarchy_number: update.hierarchy_number })
          .eq('id', update.id)
          .select('id');
          
        if (error) {
          console.error('Sequential hierarchy update error:', error.message);
          throw new Error(`Failed to update hierarchy: ${error.message}`);
        }
        
        if (data) results.push(...data);
        
        // Reduced delay for faster operations
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      console.log('✅ Smart hierarchy update completed for', results.length, 'tasks');
      return results;
    },
    onSuccess: (data, variables) => {
      if (!variables.options?.suppressInvalidate) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('Bulk hierarchy update failed:', error);
    },
  });

  const bulkUpdatePredecessors = useMutation({
    mutationFn: async ({ updates, options }: { updates: BulkPredecessorUpdate[], options?: BulkUpdateOptions }) => {
      if (!user || updates.length === 0) return [];

      console.log('🔄 Performing bulk predecessor update for', updates.length, 'tasks');
      
      // Use batch updates for better performance
      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming the database
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const batchPromises = batch.map(update => {
          const predecessorValue = Array.isArray(update.predecessor) 
            ? update.predecessor 
            : update.predecessor;
            
          return supabase
            .from('project_schedule_tasks')
            .update({ predecessor: predecessorValue })
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