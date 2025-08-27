import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface POStatus {
  company_id: string;
  status: 'Confirmed' | 'Denied' | 'Pending';
}

export const usePOStatus = (projectId: string, costCodeId: string) => {
  const channelRef = useRef<any>(null);
  const isSubscribingRef = useRef(false);
  const queryClient = useQueryClient();
  const stableKey = `${projectId}-${costCodeId}`;

  // Query to get PO status for all companies in this cost code
  const { data: poStatuses = [], isLoading } = useQuery({
    queryKey: ['po-status', projectId, costCodeId],
    queryFn: async () => {
      if (!projectId || !costCodeId) return [];
      
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select('company_id, status, updated_at')
        .eq('project_id', projectId)
        .eq('cost_code_id', costCodeId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      console.log('🔄 usePOStatus: Raw PO data:', data);

      // Map database status to display status
      return data.map(po => {
        const mappedStatus = po.status === 'approved' ? 'Confirmed' as const :
                           po.status === 'rejected' ? 'Denied' as const :
                           'Pending' as const;
        
        console.log(`🔄 usePOStatus: Mapping ${po.status} -> ${mappedStatus} for company ${po.company_id}`);
        
        return {
          company_id: po.company_id,
          status: mappedStatus
        };
      });
    },
    enabled: !!projectId && !!costCodeId,
    staleTime: 5000, // Consider data fresh for 5 seconds to prevent excessive refetching
  });

  // Set up real-time subscription for PO status updates with better debouncing
  useEffect(() => {
    if (!projectId || !costCodeId || isSubscribingRef.current) return;

    const setupSubscription = async () => {
      console.log('🔄 usePOStatus: Setting up subscription for', stableKey);

      // Clean up any existing channel first
      if (channelRef.current) {
        console.log('🔄 usePOStatus: Cleaning up existing channel');
        try {
          await supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('🔄 usePOStatus: Error removing channel:', error);
        }
        channelRef.current = null;
      }

      isSubscribingRef.current = true;

      // Create unique channel name to avoid conflicts
      const channelName = `po-status-${stableKey}-${Date.now()}`;
      
      try {
        const channel = supabase.channel(channelName);
        
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_purchase_orders',
            filter: `project_id=eq.${projectId}`
          },
          () => {
            console.log('🔄 usePOStatus: Received realtime update for', stableKey);
            // Debounce the invalidation to prevent rapid refetches
            setTimeout(() => {
              queryClient.invalidateQueries({ 
                queryKey: ['po-status', projectId, costCodeId] 
              });
            }, 100);
          }
        );

        // Subscribe first, then store the reference
        await channel.subscribe((status) => {
          console.log('🔄 usePOStatus: Subscription status:', status, 'for channel:', channelName);
          if (status === 'SUBSCRIBED') {
            isSubscribingRef.current = false;
            channelRef.current = channel; // Only store reference after successful subscription
          } else if (status === 'CHANNEL_ERROR') {
            console.error('🔄 usePOStatus: Channel error for:', channelName);
            isSubscribingRef.current = false;
          }
        });
      } catch (error) {
        console.error('🔄 usePOStatus: Error setting up subscription:', error);
        isSubscribingRef.current = false;
      }
    };

    setupSubscription();

    return () => {
      console.log('🔄 usePOStatus: Cleanup function called for', stableKey);
      isSubscribingRef.current = false;
      if (channelRef.current) {
        // Use setTimeout to ensure cleanup happens after current execution
        setTimeout(async () => {
          try {
            if (channelRef.current) {
              await supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
          } catch (error) {
            console.warn('🔄 usePOStatus: Error removing channel in cleanup:', error);
          }
        }, 0);
      }
    };
  }, [stableKey, queryClient]); // Use stableKey instead of individual params

  const getPOStatusForCompany = (companyId: string): 'Confirmed' | 'Denied' | 'Pending' => {
    const poStatus = poStatuses.find(po => po.company_id === companyId);
    return poStatus?.status || 'Pending';
  };

  return {
    poStatuses,
    isLoading,
    getPOStatusForCompany
  };
};