
import { useQuery } from "@tanstack/react-query";
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
  predecessor: string | null;
  resources: string | null;
  parent_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  confirmed: boolean | null;
}

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
