
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type ProjectBidding = Tables<'project_bidding'>;

interface BiddingItemWithCostCode extends ProjectBidding {
  cost_codes: CostCode;
}

export const useBiddingData = (projectId: string, status?: 'draft' | 'sent' | 'closed') => {
  const [groupedBiddingItems, setGroupedBiddingItems] = useState<Record<string, BiddingItemWithCostCode[]>>({});
  const [existingCostCodeIds, setExistingCostCodeIds] = useState<string[]>([]);

  // Fetch bidding items with cost codes
  const { data: biddingItems = [], isLoading, refetch } = useQuery({
    queryKey: ['project-bidding', projectId, status],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('project_bidding')
        .select(`
          *,
          cost_codes (*)
        `)
        .eq('project_id', projectId);

      // Filter by status if provided, otherwise default to 'draft'
      const filterStatus = status || 'draft';
      query = query.eq('status', filterStatus);

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching bidding items:', error);
        throw error;
      }

      // Explicitly type the return data to avoid deep type instantiation
      return (data || []).map(item => ({
        ...item,
        cost_codes: item.cost_codes as CostCode
      })) as BiddingItemWithCostCode[];
    },
    enabled: !!projectId,
  });

  // Group bidding items by cost code category/parent_group
  useEffect(() => {
    const grouped = biddingItems.reduce((acc, item) => {
      const costCode = item.cost_codes;
      const group = costCode?.parent_group || costCode?.category || 'Uncategorized';
      
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as Record<string, BiddingItemWithCostCode[]>);

    setGroupedBiddingItems(grouped);
    setExistingCostCodeIds(biddingItems.map(item => item.cost_code_id));
  }, [biddingItems]);

  return {
    biddingItems,
    groupedBiddingItems,
    existingCostCodeIds,
    isLoading,
    refetch,
  };
};
