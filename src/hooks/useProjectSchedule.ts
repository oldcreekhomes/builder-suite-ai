import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleTask {
  id: string;
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  assigned_to?: string;
  dependencies: string[];
  color: string;
  parent_id?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface CreateTaskData {
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  assigned_to?: string;
  color: string;
  progress?: number;
}

export function useProjectSchedule(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks for a project
  const {
    data: tasks = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['project-schedule', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ScheduleTask[];
    },
    enabled: !!projectId,
  });

  // Create new task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      console.log('createTaskMutation called with:', taskData);
      
      // Calculate duration in days
      const startDate = new Date(taskData.start_date);
      const endDate = new Date(taskData.end_date);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      console.log('Calculated duration:', duration);
      console.log('About to insert into database...');

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          project_id: taskData.project_id,
          task_name: taskData.task_name,
          start_date: taskData.start_date,
          end_date: taskData.end_date,
          assigned_to: taskData.assigned_to || null,
          color: taskData.color,
          duration,
          progress: taskData.progress || 0,
          dependencies: [],
          order_index: tasks.length
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Successfully created task:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
      console.error('Error creating task:', error);
    },
  });

  // Update task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<ScheduleTask> }) => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
      console.error('Error updating task:', error);
    },
  });

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
      console.error('Error deleting task:', error);
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}