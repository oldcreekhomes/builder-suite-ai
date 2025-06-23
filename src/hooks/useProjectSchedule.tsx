import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ScheduleTask {
  id: string;
  project_id: string;
  task_code: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  resources: string[];
  predecessor_id?: string;
  created_at: string;
  updated_at: string;
}

export const useProjectSchedule = (projectId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-schedule', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching project schedule:', error);
        throw error;
      }

      return data as ScheduleTask[];
    },
    enabled: !!user && !!projectId,
  });
};

export const useAddScheduleTask = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<ScheduleTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert(task)
        .select()
        .single();

      if (error) {
        console.error('Error adding schedule task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule'] });
      toast({
        title: "Success",
        description: "Task added successfully",
      });
    },
    onError: (error) => {
      console.error('Add task error:', error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateScheduleTask = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScheduleTask> }) => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating schedule task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule'] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error) => {
      console.error('Update task error:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteScheduleTask = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting schedule task:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule'] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete task error:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });
};
