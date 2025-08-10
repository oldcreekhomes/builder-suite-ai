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
  hierarchy_number?: string;
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
  hierarchy_number?: string;
}

export const useTaskMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          project_id: params.project_id,
          task_name: params.task_name,
          start_date: params.start_date,
          end_date: params.end_date,
          duration: params.duration || 1,
          progress: params.progress || 0,
          predecessor: params.predecessor || null,
          resources: params.resources || null,
          hierarchy_number: params.hierarchy_number || "1",
        })
        .select()
        .single();

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

      console.log('🔧 UpdateTask mutation called with params:', params);

      const updateData: any = {};
      if (params.task_name !== undefined) updateData.task_name = params.task_name;
      if (params.start_date !== undefined) updateData.start_date = params.start_date;
      if (params.end_date !== undefined) updateData.end_date = params.end_date;
      if (params.duration !== undefined) updateData.duration = params.duration;
      if (params.progress !== undefined) updateData.progress = params.progress;
      if (params.predecessor !== undefined) updateData.predecessor = params.predecessor;
      if (params.resources !== undefined) updateData.resources = params.resources;
      if (params.parent_id !== undefined) updateData.parent_id = params.parent_id;
      if (params.hierarchy_number !== undefined) updateData.hierarchy_number = params.hierarchy_number;

      console.log('🔧 Update data being sent to database:', updateData);

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        console.error('🔧 Database update error:', error);
        throw error;
      }

      console.log('🔧 Database update successful:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log('🔧 Task update success with data:', data);
      console.log('🔧 Variables:', variables);
      
      console.log('✅ Task updated - refreshing cache');
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
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