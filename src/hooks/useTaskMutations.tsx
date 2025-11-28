import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask, addPendingUpdate } from "./useProjectTasks";
import { 
  calculateAllUpdates, 
  validatePredecessors 
} from "@/utils/scheduleCalculations";

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

  // Normalize date to T00:00:00 format
  const normalizeDate = (date: string) => {
    if (!date) return date;
    return date.split('T')[0] + 'T00:00:00';
  };

  const createTask = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

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
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: 'Task created successfully' });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({ title: "Error", description: 'Failed to create task', variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (params: UpdateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      // Build update data
      const updateData: any = {};
      if (params.task_name !== undefined) updateData.task_name = params.task_name;
      if (params.start_date !== undefined) updateData.start_date = normalizeDate(params.start_date);
      if (params.end_date !== undefined) updateData.end_date = normalizeDate(params.end_date);
      if (params.duration !== undefined) updateData.duration = params.duration;
      if (params.progress !== undefined) updateData.progress = params.progress;
      if (params.resources !== undefined) updateData.resources = params.resources;
      if (params.hierarchy_number !== undefined) updateData.hierarchy_number = params.hierarchy_number;
      if (params.notes !== undefined) updateData.notes = params.notes;
      
      // Validate predecessors if changing
      if (params.predecessor !== undefined) {
        const { data: allTasks } = await supabase
          .from('project_schedule_tasks')
          .select('*')
          .eq('project_id', projectId);

        if (allTasks) {
          const predecessorArray = Array.isArray(params.predecessor) 
            ? params.predecessor 
            : params.predecessor ? [params.predecessor] : [];
          
          const validation = validatePredecessors(params.id, predecessorArray, allTasks as ProjectTask[]);
          if (!validation.isValid) {
            throw new Error(validation.errors[0]);
          }
        }
        
        updateData.predecessor = Array.isArray(params.predecessor) 
          ? params.predecessor 
          : (params.predecessor ? [params.predecessor] : null);
      }

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: async (data, variables) => {
      // Add to pending updates to ignore realtime echoes
      addPendingUpdate(data.id);
      
      const dateFieldsChanged = variables.start_date || variables.end_date || variables.duration !== undefined;
      const predecessorChanged = variables.predecessor !== undefined;
      const shouldCascade = (dateFieldsChanged || predecessorChanged) && !variables.skipCascade;
      
      // Always invalidate cache for immediate UI feedback
      if (!variables.suppressInvalidate) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
      
      // Run cascade in background if needed
      if (shouldCascade) {
        runBatchCascade(data.id);
      }
    },
  });

  // Batch cascade function - calculates ALL updates in memory, then applies in one batch
  const runBatchCascade = async (changedTaskId: string) => {
    const runCascade = async () => {
      try {
        // Fetch all tasks
        const { data: allTasks } = await supabase
          .from('project_schedule_tasks')
          .select('*')
          .eq('project_id', projectId);
          
        if (!allTasks || allTasks.length === 0) return;

        // Calculate ALL updates in memory
        const { dependentUpdates, parentUpdates } = calculateAllUpdates(
          changedTaskId, 
          allTasks as ProjectTask[]
        );

        const totalUpdates = dependentUpdates.length + parentUpdates.length;
        if (totalUpdates === 0) return;

        console.log(`🔄 Batch cascade: ${dependentUpdates.length} dependents, ${parentUpdates.length} parents`);

        // Mark all tasks as pending to ignore realtime echoes
        [...dependentUpdates, ...parentUpdates].forEach(u => addPendingUpdate(u.id, 5000));

        // Apply all updates in parallel batches
        const batchSize = 10;
        const allUpdates = [
          ...dependentUpdates.map(u => ({
            id: u.id,
            start_date: u.start_date + 'T00:00:00',
            end_date: u.end_date + 'T00:00:00',
            duration: u.duration
          })),
          ...parentUpdates.map(u => ({
            id: u.id,
            start_date: u.start_date + 'T00:00:00',
            end_date: u.end_date + 'T00:00:00',
            duration: u.duration,
            progress: u.progress
          }))
        ];

        for (let i = 0; i < allUpdates.length; i += batchSize) {
          const batch = allUpdates.slice(i, i + batchSize);
          await Promise.all(batch.map(update => 
            supabase
              .from('project_schedule_tasks')
              .update(update)
              .eq('id', update.id)
          ));
        }

        console.log(`✅ Batch cascade complete: ${totalUpdates} tasks updated`);
        
        // Single cache refresh after all updates
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
        
      } catch (error) {
        console.error('❌ Batch cascade error:', error);
      }
    };

    // Run in background
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runCascade, { timeout: 2000 });
    } else {
      setTimeout(runCascade, 100);
    }
  };

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: 'Task deleted successfully' });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: 'Failed to delete task', variant: "destructive" });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
};
