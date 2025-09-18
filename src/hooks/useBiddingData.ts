
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BiddingCompany {
  id: string;
  bid_package_id: string;
  company_id: string;
  bid_status: string | null;
  price: number | null;
  due_date: string | null;
  reminder_date: string | null;
  proposals: string[] | null;
  created_at: string;
  updated_at: string;
  companies: {
    id: string;
    company_name: string;
    company_type: string;
    phone_number: string | null;
    address: string | null;
    website: string | null;
  };
}

export interface BiddingPackage {
  id: string;
  project_id: string;
  cost_code_id: string;
  name: string;
  status: string;
  due_date: string | null;
  reminder_date: string | null;
  files: string[];
  specifications: string | null;
  created_at: string;
  updated_at: string;
  cost_codes: {
    id: string;
    code: string;
    name: string;
    parent_group: string | null;
    category: string | null;
  };
  project_bids: BiddingCompany[];
}

export const useBiddingData = (projectId: string, status?: string) => {
  const query = useQuery({
    queryKey: ['project-bidding', projectId, status],
    queryFn: async () => {
      console.log('Fetching bidding data for project:', projectId, 'status:', status);
      
      let queryBuilder = supabase
        .from('project_bid_packages')
        .select(`
          *,
          cost_codes (
            id,
            code,
            name,
            parent_group,
            category
          ),
          project_bids (
            *,
            companies (
              id,
              company_name,
              company_type,
              phone_number,
              address,
              website
            )
          )
        `)
        .eq('project_id', projectId);

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching bidding data:', error);
        throw error;
      }

      console.log('Fetched bidding packages:', data?.length || 0);
      return data as BiddingPackage[];
    },
    enabled: !!projectId,
  });

  // Transform data to match expected interface
  const biddingItems = query.data || [];
  
  // Group items by cost code parent group
  const groupedBiddingItems = biddingItems.reduce((groups, item) => {
    const group = item.cost_codes?.parent_group || 'Other';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, BiddingPackage[]>);

  // Sort items within each group by cost code numerically
  Object.keys(groupedBiddingItems).forEach(group => {
    groupedBiddingItems[group].sort((a, b) => {
      const codeA = a.cost_codes?.code || '';
      const codeB = b.cost_codes?.code || '';
      
      // Parse cost codes as actual numbers (handles decimals like 4010.1)
      const numA = parseFloat(codeA) || 0;
      const numB = parseFloat(codeB) || 0;
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // If numeric parts are equal, fall back to string comparison
      return codeA.localeCompare(codeB);
    });
  });

  // Get existing cost code IDs
  const existingCostCodeIds = new Set(biddingItems.map(item => item.cost_code_id));

  return {
    ...query,
    biddingItems,
    groupedBiddingItems,
    existingCostCodeIds,
  };
};

export const useAllBiddingData = (projectId: string) => {
  return useQuery({
    queryKey: ['all-project-bidding', projectId],
    queryFn: async () => {
      console.log('Fetching all bidding data for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_bid_packages')
        .select(`
          *,
          cost_codes (
            id,
            code,
            name,
            parent_group,
            category
          ),
          project_bids (
            *,
            companies (
              id,
              company_name,
              company_type,
              phone_number,
              address,
              website
            )
          )
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching all bidding data:', error);
        throw error;
      }

      console.log('Fetched all bidding packages:', data?.length || 0);
      return data as BiddingPackage[];
    },
    enabled: !!projectId,
  });
};
