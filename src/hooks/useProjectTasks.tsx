
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProjectTask {
  id: string; // UUID for database operations
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  predecessor: string | null;
  resources: string | null;
  parent_id: string | null; // UUID-based parent reference
  order_index: number;
  created_at: string;
  updated_at: string;
  task_number: number; // Keep for legacy support
}

export interface GanttTask {
  id: string; // Use UUID as Gantt ID
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  predecessor: string | null;
  resources: string | null;
  parentID: string | null; // UUID-based parent reference
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Data mapping functions
export const formatDataForGantt = (supabaseData: ProjectTask[]): GanttTask[] => {
  return supabaseData.map(task => ({
    id: task.id, // Use UUID as Gantt ID
    project_id: task.project_id,
    task_name: task.task_name,
    start_date: task.start_date,
    end_date: task.end_date,
    duration: task.duration,
    progress: task.progress,
    predecessor: task.predecessor,
    resources: task.resources,
    parentID: task.parent_id, // Map parent_id to parentID
    order_index: task.order_index,
    created_at: task.created_at,
    updated_at: task.updated_at,
  }));
};

export const formatDataForSupabase = (ganttData: GanttTask): Partial<ProjectTask> => {
  return {
    id: ganttData.id, // UUID remains the same
    project_id: ganttData.project_id,
    task_name: ganttData.task_name,
    start_date: ganttData.start_date,
    end_date: ganttData.end_date,
    duration: ganttData.duration,
    progress: ganttData.progress,
    predecessor: ganttData.predecessor,
    resources: ganttData.resources,
    parent_id: ganttData.parentID, // Map parentID back to parent_id
    order_index: ganttData.order_index,
  };
};

export const useProjectTasks = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-tasks', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase.rpc('get_project_tasks', {
        project_id_param: projectId
      });

      if (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
      }

      return (data || []) as ProjectTask[];
    },
    enabled: !!user && !!projectId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

// Hook specifically for Gantt chart usage
export const useProjectTasksForGantt = (projectId: string) => {
  const tasksQuery = useProjectTasks(projectId);
  
  return {
    ...tasksQuery,
    data: tasksQuery.data ? formatDataForGantt(tasksQuery.data) : undefined,
  };
};
