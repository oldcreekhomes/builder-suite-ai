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

      console.log('🔄 Performing sequential hierarchy update for', updates.length, 'tasks');
      
      // Sort updates by hierarchy number in descending order to avoid constraint violations
      // Higher numbers get updated first to clear the way for lower numbers
      const sortedUpdates = [...updates].sort((a, b) => {
        const aLevel = a.hierarchy_number.split('.').length;
        const bLevel = b.hierarchy_number.split('.').length;
        if (aLevel !== bLevel) return bLevel - aLevel; // Deeper levels first
        return b.hierarchy_number.localeCompare(a.hierarchy_number, undefined, { numeric: true });
      });
      
      console.log('📊 Sequential update order:', sortedUpdates.map(u => `${u.id}: ${u.hierarchy_number}`));
      
      const results = [];
      
      // Process updates one by one to avoid unique constraint violations
      for (const update of sortedUpdates) {
        console.log(`🔄 Updating task ${update.id} to hierarchy ${update.hierarchy_number}`);
        
        const { data, error } = await supabase
          .from('project_schedule_tasks')
          .update({ hierarchy_number: update.hierarchy_number })
          .eq('id', update.id)
          .select('id');
          
        if (error) {
          console.error('Sequential hierarchy update error:', error);
          throw error;
        }
        
        if (data) results.push(...data);
        
        // Small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log('✅ Sequential hierarchy update completed for', results.length, 'tasks');
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
            ? JSON.stringify(update.predecessor) 
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