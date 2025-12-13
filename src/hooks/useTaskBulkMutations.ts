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
      
      // Fallback: TWO-PHASE update to avoid unique constraint violations
      // Phase 1: Set all to temporary values (frees up real hierarchy numbers)
      // Phase 2: Set all to final values (no conflicts since all real values are free)
      // WITH ROLLBACK PROTECTION: If Phase 2 fails, restore original values
      console.log('📋 Using two-phase update fallback for hierarchy changes');
      
      // STORE ORIGINAL VALUES for rollback (fetch current hierarchy_numbers)
      const { data: currentTasks, error: fetchError } = await supabase
        .from('project_schedule_tasks')
        .select('id, hierarchy_number')
        .in('id', updates.map(u => u.id));
      
      if (fetchError) {
        console.error('❌ Failed to fetch current values for rollback:', fetchError);
        throw fetchError;
      }
      
      const originalValues = new Map(currentTasks?.map(t => [t.id, t.hierarchy_number]) || []);
      console.log('💾 Stored original values for potential rollback:', originalValues.size, 'tasks');
      
      // PHASE 1: Clear all hierarchies to temporary unique values
      console.log('🔄 Phase 1: Setting temporary hierarchy values...');
      const phase1Promises = updates.map((update, index) => 
        supabase
          .from('project_schedule_tasks')
          .update({ hierarchy_number: `__TEMP_${index}__` })
          .eq('id', update.id)
      );
      
      const phase1Results = await Promise.all(phase1Promises);
      const phase1Error = phase1Results.find(r => r.error);
      if (phase1Error?.error) {
        console.error('❌ Phase 1 failed:', phase1Error.error);
        throw phase1Error.error;
      }
      console.log(`✅ Phase 1 completed in ~${Date.now() - timestamp}ms`);
      
      // PHASE 2: Set final hierarchy values (no conflicts now)
      console.log('🔄 Phase 2: Setting final hierarchy values...');
      const phase2Start = Date.now();
      
      try {
        const phase2Promises = updates.map(update => 
          supabase
            .from('project_schedule_tasks')
            .update({ 
              hierarchy_number: update.hierarchy_number,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.id)
            .select('id')
        );
        
        const phase2Results = await Promise.all(phase2Promises);
        const phase2Error = phase2Results.find(r => r.error);
        if (phase2Error?.error) {
          console.error('❌ Phase 2 failed:', phase2Error.error);
          throw phase2Error.error;
        }

        const data = phase2Results.flatMap(r => r.data || []);
        console.log(`✅ Two-phase update completed: ${updates.length} tasks in ~${Date.now() - timestamp}ms (Phase 2: ${Date.now() - phase2Start}ms)`);
        return data;
      } catch (phase2Error) {
        // ROLLBACK: Phase 2 failed, restore original hierarchy values
        console.error('🔄 ROLLBACK: Phase 2 failed, restoring original hierarchy values...');
        
        const rollbackPromises = Array.from(originalValues.entries()).map(([id, hierarchyNumber]) => 
          supabase
            .from('project_schedule_tasks')
            .update({ hierarchy_number: hierarchyNumber })
            .eq('id', id)
        );
        
        try {
          await Promise.all(rollbackPromises);
          console.log('✅ ROLLBACK completed: Original hierarchy values restored');
        } catch (rollbackError) {
          console.error('❌ ROLLBACK FAILED:', rollbackError);
          // Still throw the original error, but log the rollback failure
        }
        
        throw phase2Error;
      }
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