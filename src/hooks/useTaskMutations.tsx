import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { ProjectTask } from "./useProjectTasks";

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
}

export const useTaskMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      toast.success('Task created successfully');
      
      // Skip parent recalculation if batch operation is in progress
      if (data.hierarchy_number && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task created, triggering parent recalculation for:', data.hierarchy_number);
        window.dispatchEvent(new CustomEvent('recalculate-parents', { 
          detail: { hierarchyNumber: data.hierarchy_number } 
        }));
      }
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
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

      const updateData: any = {};
      if (params.task_name !== undefined) updateData.task_name = params.task_name;
      if (params.start_date !== undefined) updateData.start_date = normalizeDate(params.start_date);
      if (params.end_date !== undefined) updateData.end_date = normalizeDate(params.end_date);
      if (params.duration !== undefined) updateData.duration = params.duration;
      if (params.progress !== undefined) updateData.progress = params.progress;
      if (params.predecessor !== undefined) {
        // Validate predecessors before updating
        const { data: allTasks } = await supabase
          .from('project_schedule_tasks')
          .select('*')
          .eq('project_id', projectId);

        if (allTasks) {
          const predecessorArray = Array.isArray(params.predecessor) 
            ? params.predecessor 
            : params.predecessor ? [params.predecessor] : [];
          
          const { validatePredecessors } = await import('@/utils/predecessorValidation');
          const validation = validatePredecessors(params.id, predecessorArray, allTasks as ProjectTask[]);
          
          if (!validation.isValid) {
            throw new Error(validation.errors[0]);
          }
        }
        
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
      console.log('🔧 Variables:', variables);
      
      // Add task to pending updates to ignore realtime echoes
      const { addPendingUpdate } = await import('@/hooks/useProjectTasks');
      addPendingUpdate(data.id);
      
      // Only invalidate cache if not suppressed (for bulk operations)
      if (!variables.suppressInvalidate) {
        console.log('✅ Task updated - refreshing cache');
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
      
      // Only trigger parent recalculation if not suppressed, dates/duration changed, and no batch operation
      const dateFieldsChanged = variables.start_date || variables.end_date || variables.duration !== undefined;
      if (data.hierarchy_number && dateFieldsChanged && !variables.suppressInvalidate && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task dates/duration updated, triggering parent recalculation for:', data.hierarchy_number);
        window.dispatchEvent(new CustomEvent('recalculate-parents', { 
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
      toast.success('Task deleted successfully');
      
      // Skip parent recalculation if batch operation is in progress
      if (data.hierarchy_number && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task deleted, triggering parent recalculation for:', data.hierarchy_number);
        window.dispatchEvent(new CustomEvent('recalculate-parents', { 
          detail: { hierarchyNumber: data.hierarchy_number } 
        }));
      }
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
};