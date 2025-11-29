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
      
      // Fallback: Use parallel updates (all sent at once via Promise.all)
      // This is much faster than sequential and avoids the upsert column requirements
      console.log('📋 Using parallel update batch for hierarchy changes');
      
      const updatePromises = updates.map(update => 
        supabase
          .from('project_schedule_tasks')
          .update({ 
            hierarchy_number: update.hierarchy_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
          .select('id')
      );
      
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) {
        console.error('❌ Parallel batch update failed:', errorResult.error);
        throw errorResult.error;
      }

      const data = results.flatMap(r => r.data || []);
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