
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
  price: number | null;
  proposals: string[] | null;
  companies: SimpleCompany;
}

// Simplified interface for bidding package with cost code and companies
interface BiddingPackageWithCostCode {
  id: string;
  project_id: string;
  cost_code_id: string;
  name: string;
  status: string;
  due_date: string | null;
  reminder_date: string | null;
  specifications: string | null;
  files: string[] | null;
  created_at: string;
  updated_at: string;
  cost_codes: SimpleCostCode;
  project_bid_package_companies: BiddingCompany[];
}

export const useBiddingData = (projectId: string, status?: 'draft' | 'sent' | 'closed') => {
  const [groupedBiddingItems, setGroupedBiddingItems] = useState<Record<string, BiddingPackageWithCostCode[]>>({});
  const [existingCostCodeIds, setExistingCostCodeIds] = useState<string[]>([]);

  // Fetch ALL bidding packages for the project to get existing cost code IDs
  const { data: allBiddingItems } = useQuery({
    queryKey: ['all-project-bidding', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_bid_packages')
        .select('cost_code_id')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching all bidding packages:', error);
        throw error;
      }

      return (data || []).map(item => item.cost_code_id);
    },
    enabled: !!projectId,
  });

  // Fetch bidding packages with cost codes and companies filtered by status
  const { data: biddingItems, isLoading, refetch } = useQuery({
    queryKey: ['project-bidding', projectId, status],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('project_bid_packages')
        .select(`
          *,
          cost_codes (*),
          project_bid_package_companies (
            id,
            company_id,
            bid_status,
            price,
            proposals,
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
        console.error('Error fetching bidding packages:', error);
        throw error;
      }

      // Transform the data to match our simplified interface
      const result: BiddingPackageWithCostCode[] = (data || []).map((item: any) => ({
        id: item.id,
        project_id: item.project_id,
        cost_code_id: item.cost_code_id,
        name: item.name || '',
        status: item.status,
        due_date: item.due_date,
        reminder_date: item.reminder_date,
        specifications: item.specifications,
        files: item.files || [],
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
        project_bid_package_companies: (item.project_bid_package_companies || []).map((pbc: any) => ({
          id: pbc.id,
          company_id: pbc.company_id,
          bid_status: pbc.bid_status,
          price: pbc.price || null,
          proposals: pbc.proposals || [],
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

  // Group bidding packages by cost code category/parent_group
  useEffect(() => {
    const grouped = (biddingItems || []).reduce((acc, item) => {
      const costCode = item.cost_codes;
      const group = costCode?.parent_group || costCode?.category || 'Uncategorized';
      
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as Record<string, BiddingPackageWithCostCode[]>);

    // Sort each group by cost code number
    Object.keys(grouped).forEach(group => {
      grouped[group].sort((a, b) => {
        // Extract numeric part from cost code for proper numerical sorting
        const getNumericCode = (code: string) => {
          const match = code.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getNumericCode(a.cost_codes.code) - getNumericCode(b.cost_codes.code);
      });
    });

    setGroupedBiddingItems(grouped);
  }, [biddingItems]);

  // Update existing cost code IDs from all packages (not just the current status)
  useEffect(() => {
    if (allBiddingItems) {
      setExistingCostCodeIds(allBiddingItems);
    }
  }, [allBiddingItems]);

  return {
    biddingItems: biddingItems || [],
    groupedBiddingItems,
    existingCostCodeIds,
    isLoading,
    refetch,
  };
};
