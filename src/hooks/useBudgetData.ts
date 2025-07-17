
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export function useBudgetData(projectId: string) {
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes (*)
        `)
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
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
      
      // Extract numeric parts for proper numerical sorting
      const numA = parseInt(codeA.replace(/\D/g, '')) || 0;
      const numB = parseInt(codeB.replace(/\D/g, '')) || 0;
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // If numeric parts are equal, fall back to string comparison
      return codeA.localeCompare(codeB);
    });
  });

  // Get existing cost code IDs for the modal
  const existingCostCodeIds = budgetItems.map(item => item.cost_code_id);

  return {
    budgetItems,
    groupedBudgetItems,
    existingCostCodeIds
  };
}
