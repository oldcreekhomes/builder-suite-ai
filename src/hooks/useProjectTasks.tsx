
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
  progress?: number;
  predecessor?: string;
  resources?: string;
  parent_id?: string;
  
  created_at: string;
  updated_at: string;
  confirmed?: boolean;
  hierarchy_number?: string;
}

export const useProjectTasks = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for task updates
  useEffect(() => {
    if (!projectId || !user) return;

    console.log('🔥 useProjectTasks: Setting up real-time subscription for project tasks:', projectId);
    console.log('🔥 useProjectTasks: User ID:', user.id);

    // Use a stable channel name without timestamp to prevent duplicate subscriptions
    const channelName = `project-tasks-${projectId}-${user.id}`;
    console.log('🔥 useProjectTasks: Channel name:', channelName);

    // Remove any existing channel with the same name first
    const existingChannels = supabase.getChannels();
    const existingChannel = existingChannels.find(ch => ch.topic === channelName);
    if (existingChannel) {
      console.log('🔥 useProjectTasks: Removing existing channel:', channelName);
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(channelName)
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
          
          // Check if Syncfusion operation is in progress - if so, skip real-time updates
          const isSyncfusionOperationInProgress = (window as any).__syncfusionOperationInProgress;
          if (isSyncfusionOperationInProgress) {
            console.log('🚫 Skipping real-time update - Syncfusion operation in progress');
            return;
          }
          
          // Longer delay to allow Syncfusion operations to complete
          setTimeout(() => {
            console.log('🔄 Processing real-time update after delay');
            queryClient.invalidateQueries({
              queryKey: ['project-tasks', projectId, user.id]
            });
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('Task subscription status:', status);
      });

    return () => {
      console.log('🔥 useProjectTasks: Cleaning up project tasks subscription for channel:', channelName);
      supabase.removeChannel(channel);
    };
  }, [projectId, user?.id, queryClient]);

  return useQuery({
    queryKey: ['project-tasks', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
      }

      return (data || []) as ProjectTask[];
    },
    enabled: !!user && !!projectId,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
