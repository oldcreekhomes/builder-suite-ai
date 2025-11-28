import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask, addPendingUpdate } from "./useProjectTasks";
import { getDependentTasks, calculateTaskDatesFromPredecessors } from "@/utils/taskCalculations";

interface CreateTaskParams {
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration?: number;
  progress?: number;
  predecessor?: string[] | string;
  resources?: string;
  hierarchy_number?: string;
}

interface UpdateTaskParams {
  id: string;
  task_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  progress?: number;
  predecessor?: string[] | string;
  resources?: string;
  hierarchy_number?: string;
  notes?: string;
  suppressInvalidate?: boolean;
  skipCascade?: boolean;
}

export const useTaskMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTask = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      // Note: We removed the pre-check for duplicate hierarchy numbers here
      // because the bulk hierarchy updates should have cleared the way
      // The database constraint will catch any real duplicates as a failsafe

      // Normalize dates to include T00:00:00 format
      const normalizeDate = (date: string) => {
        if (!date) return date;
        // Remove any UTC suffix and ensure T00:00:00 format
        return date.split('T')[0] + 'T00:00:00';
      };

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          project_id: params.project_id,
          task_name: params.task_name,
          start_date: normalizeDate(params.start_date),
          end_date: normalizeDate(params.end_date),
          duration: params.duration || 1,
          progress: params.progress || 0,
          predecessor: Array.isArray(params.predecessor) ? params.predecessor : (params.predecessor ? [params.predecessor] : null),
          resources: params.resources || null,
          hierarchy_number: params.hierarchy_number || "1",
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: 'Task created successfully' });
      
      // Skip parent recalculation if batch operation is in progress
      if (data.hierarchy_number && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task created, triggering optimized parent recalculation for:', data.hierarchy_number);
        window.dispatchEvent(new CustomEvent('optimized-recalculate-parents', { 
          detail: { hierarchyNumber: data.hierarchy_number } 
        }));
      }
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({ title: "Error", description: 'Failed to create task', variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (params: UpdateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      console.log('🔧 UpdateTask mutation called with params:', params);

      // Check for duplicate hierarchy number before updating (if hierarchy_number is being changed)
      if (params.hierarchy_number !== undefined) {
        const { data: currentTask } = await supabase
          .from('project_schedule_tasks')
          .select('project_id, hierarchy_number')
          .eq('id', params.id)
          .single();

        if (currentTask && params.hierarchy_number !== currentTask.hierarchy_number) {
          const { data: existingTask } = await supabase
            .from('project_schedule_tasks')
            .select('id')
            .eq('project_id', currentTask.project_id)
            .eq('hierarchy_number', params.hierarchy_number)
            .neq('id', params.id)
            .maybeSingle();

          if (existingTask) {
            throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
          }
        }
      }

      // Normalize dates to include T00:00:00 format
      const normalizeDate = (date: string) => {
        if (!date) return date;
        // Remove any UTC suffix and ensure T00:00:00 format
        return date.split('T')[0] + 'T00:00:00';
      };

      // Build update data - validation already done on client side
      const updateData: any = {};
      if (params.task_name !== undefined) updateData.task_name = params.task_name;
      if (params.start_date !== undefined) updateData.start_date = normalizeDate(params.start_date);
      if (params.end_date !== undefined) updateData.end_date = normalizeDate(params.end_date);
      if (params.duration !== undefined) updateData.duration = params.duration;
      if (params.progress !== undefined) updateData.progress = params.progress;
      if (params.predecessor !== undefined) {
        updateData.predecessor = Array.isArray(params.predecessor) ? params.predecessor : (params.predecessor ? [params.predecessor] : null);
      }
      if (params.resources !== undefined) updateData.resources = params.resources;
      if (params.hierarchy_number !== undefined) updateData.hierarchy_number = params.hierarchy_number;
      if (params.notes !== undefined) updateData.notes = params.notes;

      console.log('🔧 Update data being sent to database:', updateData);

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        console.error('🔧 Database update error:', error);
        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
        }
        throw error;
      }

      console.log('🔧 Database update successful:', data);
      return data;
    },
    onSuccess: async (data, variables) => {
      console.log('🔧 Task update success with data:', data);
      
      // Add task to pending updates to ignore realtime echoes
      addPendingUpdate(data.id);
      
      // Check if we need to cascade updates to dependent tasks
      const dateFieldsChanged = variables.start_date || variables.end_date || variables.duration !== undefined;
      const predecessorChanged = variables.predecessor !== undefined;
      const shouldCascade = (dateFieldsChanged || predecessorChanged) && !variables.skipCascade;
      
      // CRITICAL: Get cached data BEFORE invalidating the cache!
      let cachedTasks: ProjectTask[] | null = null;
      if (shouldCascade) {
        cachedTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || null;
      }
      
      // Now invalidate cache for UI refresh (after we've captured the data we need)
      if (!variables.suppressInvalidate) {
        console.log('✅ Task updated - immediate cache refresh');
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
      
      // Run cascade with the cached data we captured earlier
      if (shouldCascade && cachedTasks && cachedTasks.length > 0) {
        // Update the changed task in our working copy
        const workingTasks = cachedTasks.map(t => {
          if (t.id !== data.id) return t;
          return {
            ...t,
            start_date: data.start_date,
            end_date: data.end_date,
            duration: data.duration,
            predecessor: t.predecessor // Keep existing predecessor type
          };
        });
        
        // Run cascade with cached data
        await cascadeDependentUpdates(data.id, workingTasks);
        
        // Invalidate again after cascade to ensure UI shows all cascaded updates
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
      
      // Only trigger parent recalculation if not suppressed, dates/duration changed, and no batch operation
      if (data.hierarchy_number && dateFieldsChanged && !variables.suppressInvalidate && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task dates/duration updated, triggering optimized parent recalculation for:', data.hierarchy_number);
        window.dispatchEvent(new CustomEvent('optimized-recalculate-parents', { 
          detail: { hierarchyNumber: data.hierarchy_number } 
        }));
      }
    },
    onError: (error) => {
      console.error('🔧 Task update error:', error);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: 'Task deleted successfully' });
      
      // Skip parent recalculation if batch operation is in progress
      if (data.hierarchy_number && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task deleted, triggering optimized parent recalculation for:', data.hierarchy_number);
        window.dispatchEvent(new CustomEvent('optimized-recalculate-parents', { 
          detail: { hierarchyNumber: data.hierarchy_number } 
        }));
      }
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: 'Task deleted successfully', variant: "destructive" });
    },
  });

  // Centralized cascade function with parallel processing for speed
  const cascadeDependentUpdates = async (changedTaskId: string, allTasks: ProjectTask[]) => {
    
    const queue: string[] = [changedTaskId];
    const processed = new Set<string>();
    const maxDepth = 25;
    let depth = 0;
    
    console.log(`🔄 Starting cascade for task ${changedTaskId}`);
    
    while (queue.length > 0 && depth < maxDepth) {
      const currentTaskId = queue.shift()!;
      
      if (processed.has(currentTaskId)) continue;
      processed.add(currentTaskId);
      
      const dependentTasks = getDependentTasks(currentTaskId, allTasks);
      console.log(`📋 Cascade depth ${depth}: Found ${dependentTasks.length} dependents for task ${currentTaskId}`);
      
      // Process dependent tasks in parallel batches for speed
      const updatePromises = dependentTasks.map(async (depTask) => {
        const dateUpdate = calculateTaskDatesFromPredecessors(depTask, allTasks);
        if (dateUpdate) {
          const currentStartDate = depTask.start_date.split('T')[0];
          const currentEndDate = depTask.end_date.split('T')[0];
          
          if (currentStartDate !== dateUpdate.startDate || currentEndDate !== dateUpdate.endDate) {
            console.log(`🔄 Cascade update: ${depTask.hierarchy_number}: ${depTask.task_name}`, 
              `${currentStartDate} → ${dateUpdate.startDate}, ${currentEndDate} → ${dateUpdate.endDate}`);
            
            try {
              await updateTask.mutateAsync({
                id: depTask.id,
                start_date: dateUpdate.startDate,
                end_date: dateUpdate.endDate,
                duration: dateUpdate.duration,
                suppressInvalidate: true,
                skipCascade: true
              });
              
              // Update the task in our working array for further calculations
              const taskIndex = allTasks.findIndex(t => t.id === depTask.id);
              if (taskIndex !== -1) {
                allTasks[taskIndex] = {
                  ...allTasks[taskIndex],
                  start_date: dateUpdate.startDate + 'T00:00:00',
                  end_date: dateUpdate.endDate + 'T00:00:00',
                  duration: dateUpdate.duration
                };
              }
              
              // Return task ID for next level processing
              return depTask.id;
            } catch (error) {
              console.error(`❌ Failed to cascade update task ${depTask.id}:`, error);
              return null;
            }
          }
        }
        return null;
      });
      
      // Wait for all updates in this level to complete, then add successful ones to queue
      const results = await Promise.all(updatePromises);
      results.filter(Boolean).forEach(taskId => queue.push(taskId!));
      
      depth++;
    }
    
    if (depth >= maxDepth) {
      console.warn(`⚠️ Cascade stopped at max depth ${maxDepth}`);
    }
    
    console.log(`✅ Cascade complete after ${depth} levels`);
  };

  return {
    createTask,
    updateTask,
    deleteTask,
  };
};