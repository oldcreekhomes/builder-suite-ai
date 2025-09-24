import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDebounce } from './useDebounce';

interface RealtimeUpdate {
  payload: any;
  timestamp: number;
}

export function useOptimizedRealtime(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingUpdatesRef = useRef<RealtimeUpdate[]>([]);
  const subscriptionRef = useRef<any>(null);

  // Debounced batch processor for realtime updates
  const processBatchedUpdates = useDebounce(
    () => {
      const updates = pendingUpdatesRef.current;
      if (updates.length === 0) return;

      console.log('🔄 Processing batched realtime updates:', updates.length);
      
      // Clear pending updates
      pendingUpdatesRef.current = [];

      // Check for operation cooldowns
      const userEditCooldownUntil = (window as any).__userEditCooldownUntil;
      const isSyncfusionOperationInProgress = (window as any).__syncfusionOperationInProgress;
      const isBatchOperationInProgress = (window as any).__batchOperationInProgress;

      if (userEditCooldownUntil && Date.now() < userEditCooldownUntil) {
        console.log('🚫 Skipping batched updates - user edit cooldown active');
        return;
      }

      if (isSyncfusionOperationInProgress || isBatchOperationInProgress) {
        console.log('🚫 Skipping batched updates - operations in progress');
        return;
      }

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ['project-tasks', projectId, user?.id]
      });
    },
    1500, // Increased debounce delay
    { maxWait: 5000 } // Force processing after 5 seconds max
  );

  useEffect(() => {
    if (!projectId || !user?.id) return;

    const subscriptionKey = `optimized-project-tasks-${projectId}-${user.id}`;
    
    console.log('🔥 Setting up optimized realtime subscription:', subscriptionKey);

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
          // Check if this is our own write (ignore local echoes)
          const recordId = (payload.new as any)?.id || (payload.old as any)?.id;
          if (recordId && window.__pendingLocalUpdates?.has(recordId)) {
            const expireTime = window.__pendingLocalUpdates.get(recordId);
            if (expireTime && Date.now() < expireTime) {
              console.log('🚫 Realtime update ignored (local echo) for id:', recordId);
              return;
            }
          }

          console.log('📨 Realtime update received, adding to batch');
          
          // Add to batch instead of processing immediately
          pendingUpdatesRef.current.push({
            payload,
            timestamp: Date.now()
          });

          // Trigger batched processing
          processBatchedUpdates();
        }
      )
      .subscribe((status) => {
        console.log('Optimized realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🔥 Cleaning up optimized realtime subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      // No cleanup needed for debounced function in this implementation
    };
  }, [projectId, user?.id, queryClient, processBatchedUpdates]);

  return {
    // Expose method to force process pending updates if needed
    forceBatchProcess: () => {
      processBatchedUpdates();
    }
  };
}