import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
  predecessor?: string[] | string;
  resources?: string;
  hierarchy_number?: string;
  created_at: string;
  updated_at: string;
  confirmed?: boolean;
  notes?: string;
}

// Global subscription manager to prevent duplicate subscriptions
const subscriptionManager = new Map<string, any>();

export const useProjectTasks = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Set up real-time subscription for task updates - SIMPLIFIED
  useEffect(() => {
    if (!projectId || !user?.id) return;

    const subscriptionKey = `project-tasks-${projectId}-${user.id}`;
    
    // Check if there's already a subscription for this key
    if (subscriptionManager.has(subscriptionKey)) {
      console.log('🔥 useProjectTasks: Subscription already exists for:', subscriptionKey);
      return;
    }

    console.log('🔥 useProjectTasks: Setting up simplified real-time subscription:', subscriptionKey);

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_schedule_tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('📨 Real-time task update received:', payload.eventType);
          
          // Simple: just invalidate queries on any change
          // No more echo prevention, TTL, or cooldowns
          queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
        }
      )
      .subscribe((status) => {
        console.log('Task subscription status:', status);
      });

    // Store the subscription in our manager and ref
    subscriptionManager.set(subscriptionKey, channel);
    subscriptionRef.current = channel;

    return () => {
      console.log('🔥 useProjectTasks: Cleaning up subscription for key:', subscriptionKey);
      
      // Remove from subscription manager
      if (subscriptionManager.has(subscriptionKey)) {
        subscriptionManager.delete(subscriptionKey);
      }
      
      // Remove the channel
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
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
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
};
