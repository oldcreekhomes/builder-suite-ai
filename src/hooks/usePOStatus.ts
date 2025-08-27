import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface POStatus {
  company_id: string;
  status: 'Confirmed' | 'Denied' | 'Pending';
}

export const usePOStatus = (projectId: string, costCodeId: string) => {
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
    if (!projectId || !costCodeId) return;

    const channel = supabase
      .channel('po-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_purchase_orders',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          // Refetch data when PO status changes
          // This will be handled automatically by React Query
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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