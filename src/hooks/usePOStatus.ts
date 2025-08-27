import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface POStatus {
  company_id: string;
  status: 'Confirmed' | 'Denied' | 'Pending';
}

export const usePOStatus = (projectId: string, costCodeId: string) => {
  const channelRef = useRef<any>(null);
  const isSubscribingRef = useRef(false);

  // Query to get PO status for all companies in this cost code
  const { data: poStatuses = [], isLoading } = useQuery({
    queryKey: ['po-status', projectId, costCodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select('company_id, status')
        .eq('project_id', projectId)
        .eq('cost_code_id', costCodeId);

      if (error) throw error;

      // Map database status to display status
      return data.map(po => ({
        company_id: po.company_id,
        status: po.status === 'confirmed' ? 'Confirmed' as const :
               po.status === 'denied' ? 'Denied' as const :
               'Pending' as const
      }));
    },
    enabled: !!projectId && !!costCodeId
  });

  // Set up real-time subscription for PO status updates
  useEffect(() => {
    if (!projectId || !costCodeId || isSubscribingRef.current) return;

    console.log('🔄 usePOStatus: Setting up subscription for', projectId, costCodeId);

    // Clean up any existing channel first
    if (channelRef.current) {
      console.log('🔄 usePOStatus: Cleaning up existing channel');
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('🔄 usePOStatus: Error removing channel:', error);
      }
      channelRef.current = null;
    }

    isSubscribingRef.current = true;

    // Create unique channel name to avoid conflicts
    const channelName = `po-status-${projectId}-${costCodeId}-${Date.now()}-${Math.random()}`;
    console.log('🔄 usePOStatus: Creating channel:', channelName);
    
    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_purchase_orders',
            filter: `project_id=eq.${projectId}`
          },
          () => {
            console.log('🔄 usePOStatus: Received realtime update');
            // Refetch data when PO status changes
            // This will be handled automatically by React Query
          }
        );

      channelRef.current = channel;
      
      channel.subscribe((status) => {
        console.log('🔄 usePOStatus: Subscription status:', status, 'for channel:', channelName);
        isSubscribingRef.current = false;
      });
    } catch (error) {
      console.error('🔄 usePOStatus: Error setting up subscription:', error);
      isSubscribingRef.current = false;
    }

    return () => {
      console.log('🔄 usePOStatus: Cleanup function called for', projectId, costCodeId);
      isSubscribingRef.current = false;
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('🔄 usePOStatus: Error removing channel in cleanup:', error);
        }
        channelRef.current = null;
      }
    };
  }, [projectId, costCodeId]);

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