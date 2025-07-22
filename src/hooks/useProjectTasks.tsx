import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProjectTask {
  id: string;
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  predecessor?: string;
  resources?: string;
  parent_id?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface GanttTask {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Duration: number;
  Progress: number;
  Predecessor?: string;
  Resources?: string;
  parentID?: string;
}

export const useProjectTasks = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projectTasks', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase.rpc('get_project_tasks', {
        project_id_param: projectId
      });

      if (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
      }

      // Transform database format to Gantt format
      return (data || []).map((task: any) => ({
        TaskID: task.id,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Progress: task.progress,
        Predecessor: task.predecessor || undefined,
        Resources: task.resources || undefined,
        parentID: task.parent_id || undefined,
      })) as GanttTask[];
    },
    enabled: !!user && !!projectId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
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
    }) => {
      const { data, error } = await supabase.rpc('create_project_task', task);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['projectTasks', variables.project_id] 
      });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
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
    }) => {
      const { data, error } = await supabase.rpc('update_project_task', updates);

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['projectTasks'] 
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_project_task', {
        task_id: id
      });

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['projectTasks'] 
      });
    },
  });
};