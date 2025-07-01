
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;
type ProjectBidding = Tables<'project_bidding'>;

// Simplified interface to avoid deep type instantiation
interface BiddingItemWithCostCode {
  id: string;
  project_id: string;
  cost_code_id: string;
  quantity: number | null;
  unit_price: number | null;
  created_at: string;
  updated_at: string;
  cost_codes: CostCode;
}

export const useBiddingData = (projectId: string, status?: 'draft' | 'sent' | 'closed') => {
  const [groupedBiddingItems, setGroupedBiddingItems] = useState<Record<string, BiddingItemWithCostCode[]>>({});
  const [existingCostCodeIds, setExistingCostCodeIds] = useState<string[]>([]);

  // Fetch bidding items with cost codes
  const { data: biddingItems = [], isLoading, refetch } = useQuery({
    queryKey: ['project-bidding', projectId, status],
    queryFn: async (): Promise<BiddingItemWithCostCode[]> => {
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

      // Transform the data to match our interface
      return (data || []).map(item => ({
        id: item.id,
        project_id: item.project_id,
        cost_code_id: item.cost_code_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        created_at: item.created_at,
        updated_at: item.updated_at,
        cost_codes: item.cost_codes as CostCode
      }));
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
