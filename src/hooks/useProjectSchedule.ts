
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleTask {
  id: string;
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration?: number;
  progress?: number;
  predecessor?: string;
  resources?: string;
  notes?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export const useProjectSchedule = (projectId: string) => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['project-schedule', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      console.log('Fetching schedule tasks for project:', projectId);

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching schedule tasks:', error);
        throw error;
      }

      console.log('Fetched schedule tasks:', data);
      return data as ScheduleTask[];
    },
    enabled: !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (task: Omit<ScheduleTask, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating new task:', task);

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert([task])
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      console.log('Created task:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleTask> & { id: string }) => {
      console.log('Updating task:', id, updates);

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      console.log('Updated task:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      console.log('Deleting task:', taskId);

      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      console.log('Deleted task:', taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
  };
};
