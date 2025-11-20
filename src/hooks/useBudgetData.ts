
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export function useBudgetData(projectId: string, lotId?: string | null) {
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['project-budgets', projectId, lotId],
    queryFn: async () => {
      let query = supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes (*),
          selected_bid:project_bids!selected_bid_id (
            id,
            price,
            companies (
              company_name
            )
          )
        `)
        .eq('project_id', projectId);
      
      // Filter by lot_id if provided
      if (lotId) {
        query = query.eq('lot_id', lotId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    placeholderData: (previousData) => previousData,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch all cost codes to understand the hierarchy
  const { data: allCostCodes = [] } = useQuery({
    queryKey: ['cost-codes-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('code, parent_group');
      
      if (error) throw error;
      return data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Group budget items by parent group and sort by cost code
  const groupedBudgetItems = budgetItems.reduce((acc, item) => {
    const costCode = item.cost_codes as CostCode;
    const group = costCode?.parent_group || 'Uncategorized';
    
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof budgetItems>);

  // Sort items within each group by cost code numerically
  Object.keys(groupedBudgetItems).forEach(group => {
    groupedBudgetItems[group].sort((a, b) => {
      const codeA = (a.cost_codes as CostCode)?.code || '';
      const codeB = (b.cost_codes as CostCode)?.code || '';
      
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

  // Filter out groups that are themselves children of other groups
  // Only keep top-level groups (groups where the group key has no parent_group)
  const topLevelGroupedBudgetItems: Record<string, typeof budgetItems> = {};
  Object.keys(groupedBudgetItems).forEach(groupKey => {
    // Check if this group key is itself a child of another group
    const isChildGroup = allCostCodes.some(
      cc => cc.code === groupKey && cc.parent_group && cc.parent_group.trim() !== ''
    );
    
    // Only include if it's NOT a child group
    if (!isChildGroup) {
      topLevelGroupedBudgetItems[groupKey] = groupedBudgetItems[groupKey];
    }
  });

  // Get existing cost code IDs for the modal
  const existingCostCodeIds = budgetItems.map(item => item.cost_code_id);

  return {
    budgetItems,
    groupedBudgetItems: topLevelGroupedBudgetItems,
    existingCostCodeIds
  };
}
