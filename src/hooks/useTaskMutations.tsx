
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface CreateTaskParams {
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration?: number;
  progress?: number;
  predecessor?: string;
  resources?: string;
  parent_id?: string;
  order_index?: number;
}

interface UpdateTaskParams {
  id: string;
  task_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  progress?: number;
  predecessor?: string;
  resources?: string;
  parent_id?: string;
  order_index?: number;
}

export const useTaskMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('create_project_task', {
        project_id_param: params.project_id,
        task_name_param: params.task_name,
        start_date_param: params.start_date,
        end_date_param: params.end_date,
        duration_param: params.duration || 1,
        progress_param: params.progress || 0,
        predecessor_param: params.predecessor || null,
        resources_param: params.resources || null,
        parent_id_param: params.parent_id ? params.parent_id : null,
        order_index_param: params.order_index || 0,
      });

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    },
  });

  const updateTask = useMutation({
    mutationFn: async (params: UpdateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      console.log('=== UPDATING TASK IN DATABASE ===');
      console.log('Task ID:', params.id);
      console.log('Parent ID being sent:', params.parent_id);
      console.log('All update params:', params);

      const { data, error } = await supabase.rpc('update_project_task', {
        id_param: params.id,
        task_name_param: params.task_name,
        start_date_param: params.start_date,
        end_date_param: params.end_date,
        duration_param: params.duration,
        progress_param: params.progress,
        predecessor_param: params.predecessor,
        resources_param: params.resources,
        parent_id_param: params.parent_id,
        order_index_param: params.order_index,
      });

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      console.log('Task update successful, database response:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('delete_project_task', {
        task_id_param: taskId,
      });

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task deleted successfully');
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
