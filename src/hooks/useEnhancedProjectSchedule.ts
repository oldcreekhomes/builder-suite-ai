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
  task_type?: string;
  priority?: string;
  cost_estimate?: number;
  actual_cost?: number;
  notes?: string;
  completion_percentage?: number;
  created_at: string;
  updated_at: string;
}

interface TaskDependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  dependency_type: string;
  lag_days: number;
}

interface ProjectResource {
  id: string;
  project_id: string;
  resource_name: string;
  resource_type: string;
  email?: string;
  hourly_rate?: number;
  availability_percent: number;
}

interface CreateTaskData {
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  assigned_to?: string;
  color: string;
  progress?: number;
  task_type?: string;
  priority?: string;
  cost_estimate?: number;
  notes?: string;
  parent_id?: string;
}

interface CreateLinkData {
  source_task_id: string;
  target_task_id: string;
  dependency_type: string;
  lag_days: number;
}

export function useEnhancedProjectSchedule(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks with enhanced data
  const {
    data: tasks = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['enhanced-project-schedule', projectId],
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

  // Fetch task dependencies
  const {
    data: dependencies = [],
  } = useQuery({
    queryKey: ['task-dependencies', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('*')
        .in('source_task_id', tasks.map(t => t.id))
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TaskDependency[];
    },
    enabled: !!projectId && tasks.length > 0,
  });

  // Fetch project resources
  const {
    data: resources = [],
  } = useQuery({
    queryKey: ['project-resources', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_resources')
        .select('*')
        .eq('project_id', projectId)
        .order('resource_name', { ascending: true });

      if (error) throw error;
      return data as ProjectResource[];
    },
    enabled: !!projectId,
  });

  // Create new task with enhanced fields
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      // Calculate duration in days
      const startDate = new Date(taskData.start_date);
      const endDate = new Date(taskData.end_date);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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
          order_index: tasks.length,
          task_type: taskData.task_type || 'task',
          priority: taskData.priority || 'medium',
          cost_estimate: taskData.cost_estimate || null,
          notes: taskData.notes || null,
          parent_id: taskData.parent_id || null,
          completion_percentage: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-project-schedule', projectId] });
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

  // Update task with enhanced fields
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<ScheduleTask> }) => {
      // Calculate duration if dates changed
      if (updates.start_date && updates.end_date) {
        const startDate = new Date(updates.start_date);
        const endDate = new Date(updates.end_date);
        updates.duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

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
      queryClient.invalidateQueries({ queryKey: ['enhanced-project-schedule', projectId] });
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
      // First delete any dependencies
      await supabase
        .from('task_dependencies')
        .delete()
        .or(`source_task_id.eq.${taskId},target_task_id.eq.${taskId}`);

      // Then delete the task
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-project-schedule', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', projectId] });
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

  // Create task dependency (link)
  const createLinkMutation = useMutation({
    mutationFn: async (linkData: CreateLinkData) => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(linkData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', projectId] });
      toast({
        title: 'Success',
        description: 'Task dependency created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create task dependency',
        variant: 'destructive',
      });
      console.error('Error creating link:', error);
    },
  });

  // Delete task dependency (link)
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', projectId] });
      toast({
        title: 'Success',
        description: 'Task dependency removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove task dependency',
        variant: 'destructive',
      });
      console.error('Error deleting link:', error);
    },
  });

  // Create project resource
  const createResourceMutation = useMutation({
    mutationFn: async (resourceData: Omit<ProjectResource, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('project_resources')
        .insert(resourceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast({
        title: 'Success',
        description: 'Resource added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add resource',
        variant: 'destructive',
      });
      console.error('Error creating resource:', error);
    },
  });

  return {
    // Data
    tasks,
    dependencies,
    resources,
    isLoading,
    error,
    
    // Task operations
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    
    // Link operations
    createLink: createLinkMutation.mutate,
    deleteLink: deleteLinkMutation.mutate,
    isCreatingLink: createLinkMutation.isPending,
    isDeletingLink: deleteLinkMutation.isPending,
    
    // Resource operations
    createResource: createResourceMutation.mutate,
    isCreatingResource: createResourceMutation.isPending,
  };
}