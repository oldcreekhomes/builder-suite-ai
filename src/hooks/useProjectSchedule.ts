
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
      
      // Transform the data to match Syncfusion Gantt format
      const transformedTasks = data?.map(task => ({
        id: task.id,
        task_name: task.task_name,
        start_date: new Date(task.start_date),
        end_date: new Date(task.end_date),
        duration: task.duration || 1,
        progress: task.progress || 0,
        predecessor: task.predecessor || '',
        resources: task.resources || '',
        notes: task.notes || '',
        parent_id: task.parent_id || null,
        project_id: task.project_id
      })) || [];
      
      console.log('Transformed tasks for Gantt:', transformedTasks);
      
      // If no tasks exist, create a sample task for testing
      if (transformedTasks.length === 0) {
        console.log('No tasks found, creating sample task...');
        const sampleTask = {
          project_id: projectId,
          task_name: 'Sample Task',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          duration: 7,
          progress: 25,
          predecessor: '',
          resources: 'Team A',
          notes: 'This is a sample task to test the Gantt chart',
          parent_id: null
        };
        
        // Create the sample task
        const { data: newTask, error: createError } = await supabase
          .from('project_schedule_tasks')
          .insert([sampleTask])
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating sample task:', createError);
        } else {
          console.log('Created sample task:', newTask);
          return [{
            id: newTask.id,
            task_name: newTask.task_name,
            start_date: new Date(newTask.start_date),
            end_date: new Date(newTask.end_date),
            duration: newTask.duration || 1,
            progress: newTask.progress || 0,
            predecessor: newTask.predecessor || '',
            resources: newTask.resources || '',
            notes: newTask.notes || '',
            parent_id: newTask.parent_id || null,
            project_id: newTask.project_id
          }];
        }
      }
      
      return transformedTasks;
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
