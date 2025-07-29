
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  const queryClient = useQueryClient();

  // Set up real-time subscription for task updates
  useEffect(() => {
    if (!projectId || !user) return;

    console.log('Setting up real-time subscription for project tasks:', projectId);

    const channel = supabase
      .channel(`project-tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_schedule_tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Real-time task update received:', payload);
          // Invalidate and refetch the project tasks
          queryClient.invalidateQueries({
            queryKey: ['project-tasks', projectId, user.id]
          });
        }
      )
      .subscribe((status) => {
        console.log('Task subscription status:', status);
      });

    return () => {
      console.log('Cleaning up project tasks subscription');
      supabase.removeChannel(channel);
    };
  }, [projectId, user, queryClient]);

  return useQuery({
    queryKey: ['project-tasks', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      console.log('Fetching project tasks for project:', projectId);

      const { data, error } = await supabase.rpc('get_project_tasks', {
        project_id_param: projectId
      });

      if (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
      }

      console.log('Raw project tasks data:', data);
      return (data || []) as ProjectTask[];
    },
    enabled: !!user && !!projectId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
