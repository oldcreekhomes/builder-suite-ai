
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Simple interface for cost code to avoid deep type instantiation
interface SimpleCostCode {
  id: string;
  code: string;
  name: string;
  unit_of_measure: string | null;
  category: string | null;
  parent_group: string | null;
}

// Simple interface for company
interface SimpleCompany {
  id: string;
  company_name: string;
  company_type: string;
}

// Interface for bidding company association
interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid';
  companies: SimpleCompany;
}

// Simplified interface for bidding item with cost code and companies
interface BiddingItemWithCostCode {
  id: string;
  project_id: string;
  cost_code_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  cost_codes: SimpleCostCode;
  project_bidding_companies: BiddingCompany[];
}

export const useBiddingData = (projectId: string, status?: 'draft' | 'sent' | 'closed') => {
  const [groupedBiddingItems, setGroupedBiddingItems] = useState<Record<string, BiddingItemWithCostCode[]>>({});
  const [existingCostCodeIds, setExistingCostCodeIds] = useState<string[]>([]);

  // Fetch bidding items with cost codes and companies
  const { data: biddingItems, isLoading, refetch } = useQuery({
    queryKey: ['project-bidding', projectId, status],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('project_bidding')
        .select(`
          *,
          cost_codes (*),
          project_bidding_companies (
            id,
            company_id,
            bid_status,
            companies (
              id,
              company_name,
              company_type
            )
          )
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

      // Transform the data to match our simplified interface
      const result: BiddingItemWithCostCode[] = (data || []).map((item: any) => ({
        id: item.id,
        project_id: item.project_id,
        cost_code_id: item.cost_code_id,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        cost_codes: {
          id: item.cost_codes?.id || '',
          code: item.cost_codes?.code || '',
          name: item.cost_codes?.name || '',
          unit_of_measure: item.cost_codes?.unit_of_measure || null,
          category: item.cost_codes?.category || null,
          parent_group: item.cost_codes?.parent_group || null,
        },
        project_bidding_companies: (item.project_bidding_companies || []).map((pbc: any) => ({
          id: pbc.id,
          company_id: pbc.company_id,
          bid_status: pbc.bid_status,
          companies: {
            id: pbc.companies?.id || '',
            company_name: pbc.companies?.company_name || '',
            company_type: pbc.companies?.company_type || '',
          }
        }))
      }));
      
      return result;
    },
    enabled: !!projectId,
  });

  // Group bidding items by cost code category/parent_group
  useEffect(() => {
    const grouped = (biddingItems || []).reduce((acc, item) => {
      const costCode = item.cost_codes;
      const group = costCode?.parent_group || costCode?.category || 'Uncategorized';
      
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as Record<string, BiddingItemWithCostCode[]>);

    setGroupedBiddingItems(grouped);
    setExistingCostCodeIds((biddingItems || []).map(item => item.cost_code_id));
  }, [biddingItems]);

  return {
    biddingItems: biddingItems || [],
    groupedBiddingItems,
    existingCostCodeIds,
    isLoading,
    refetch,
  };
};
