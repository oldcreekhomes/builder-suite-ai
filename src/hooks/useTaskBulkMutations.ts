import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ProjectTask } from "./useProjectTasks";
import { toast } from "sonner";

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
    mutationFn: async ({ updates, originalTasks, options, ordered }: { 
      updates: BulkHierarchyUpdate[], 
      originalTasks?: ProjectTask[], 
      options?: BulkUpdateOptions,
      ordered?: boolean 
    }) => {
      if (!user || updates.length === 0) return [];

      console.log('🔄 Performing smart hierarchy update for', updates.length, 'tasks');
      
      // If ordered execution is requested, apply updates sequentially
      if (ordered) {
        console.log('📋 Applying updates in provided order');
        const results = [];
        
        for (const update of updates) {
          const { data, error } = await supabase
            .from('project_schedule_tasks')
            .update({ 
              hierarchy_number: update.hierarchy_number,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.id)
            .select();
            
          if (error) {
            console.error('❌ Hierarchy update failed:', error, 'for task:', update.id);
            throw error;
          }
          
          if (data) {
            results.push(...data);
          }
        }
        
        console.log('✅ All ordered hierarchy updates completed successfully');
        return results;
      }
      
      // Use provided originalTasks or get current tasks from cache to compare directions
      const currentTasks = originalTasks || queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
      
      // Analyze update directions: increment (1 -> 2) vs decrement (3 -> 2)
      const incrementUpdates: BulkHierarchyUpdate[] = [];
      const decrementUpdates: BulkHierarchyUpdate[] = [];
      
      updates.forEach(update => {
        const currentTask = currentTasks.find(t => t.id === update.id);
        if (currentTask && currentTask.hierarchy_number) {
          // Use hierarchy-aware comparison instead of parseFloat
          const currentHierarchy = currentTask.hierarchy_number.split('.').map(n => parseInt(n));
          const targetHierarchy = update.hierarchy_number.split('.').map(n => parseInt(n));
          
          // Compare hierarchies segment by segment
          let isIncrement = false;
          for (let i = 0; i < Math.max(currentHierarchy.length, targetHierarchy.length); i++) {
            const currentPart = currentHierarchy[i] || 0;
            const targetPart = targetHierarchy[i] || 0;
            
            if (targetPart > currentPart) {
              isIncrement = true;
              break;
            } else if (targetPart < currentPart) {
              break;
            }
          }
          
          if (isIncrement) {
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
      
      // Sort decrements by current hierarchy ascending (for safe renumbering: 1.5->1.4, then 1.6->1.5)
      const sortedDecrements = decrementUpdates.sort((a, b) => {
        const taskA = currentTasks.find(t => t.id === a.id);
        const taskB = currentTasks.find(t => t.id === b.id);
        const hierarchyA = taskA?.hierarchy_number || a.hierarchy_number;
        const hierarchyB = taskB?.hierarchy_number || b.hierarchy_number;
        return hierarchyA.localeCompare(hierarchyB, undefined, { numeric: true });
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
      toast.error('Failed to update task positions');
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