import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAllBudgetSubcategories(budgetItems: any[], projectId: string) {
  return useQuery({
    queryKey: ['all-budget-subcategories', projectId, budgetItems.map(item => item.id)],
    queryFn: async () => {
      const subcategoryTotalsMap: Record<string, number> = {};

      // Find all items with subcategories
      const itemsWithSubcategories = budgetItems.filter(
        item => item.cost_codes?.has_subcategories === true
      );

      if (itemsWithSubcategories.length === 0) {
        return subcategoryTotalsMap;
      }

      // Get all parent cost codes
      const parentCostCodes = itemsWithSubcategories.map(item => item.cost_codes?.code);

      // Fetch all child cost codes where parent_group matches any parent code
      const { data: childCostCodes, error: childError } = await supabase
        .from('cost_codes')
        .select('id, code, parent_group, price, quantity')
        .in('parent_group', parentCostCodes);

      if (childError) throw childError;

      // Create a map of parent code to child cost codes
      const childCodesByParentCode: Record<string, any[]> = {};
      childCostCodes?.forEach(child => {
        if (!childCodesByParentCode[child.parent_group]) {
          childCodesByParentCode[child.parent_group] = [];
        }
        childCodesByParentCode[child.parent_group].push(child);
      });

      // Get all child cost code IDs
      const childCostCodeIds = childCostCodes?.map(cc => cc.id) || [];

      // Fetch all budget items for these child cost codes in this project
      const { data: childBudgetItems, error: budgetError } = await supabase
        .from('project_budgets')
        .select('id, cost_code_id, quantity, unit_price')
        .eq('project_id', projectId)
        .in('cost_code_id', childCostCodeIds);

      if (budgetError) throw budgetError;

      // Create a map of cost_code_id to budget item
      const budgetItemsByCostCode: Record<string, any> = {};
      childBudgetItems?.forEach(item => {
        budgetItemsByCostCode[item.cost_code_id] = item;
      });

      // Fetch all selections for these budget items
      const budgetItemIds = itemsWithSubcategories.map(item => item.id);
      const { data: selections, error: selectionsError } = await supabase
        .from('budget_subcategory_selections')
        .select('*')
        .in('project_budget_id', budgetItemIds);

      if (selectionsError) throw selectionsError;

      // Create a map of project_budget_id to selections
      const selectionsByBudgetItem: Record<string, any[]> = {};
      selections?.forEach(selection => {
        if (!selectionsByBudgetItem[selection.project_budget_id]) {
          selectionsByBudgetItem[selection.project_budget_id] = [];
        }
        selectionsByBudgetItem[selection.project_budget_id].push(selection);
      });

      // Calculate totals for each budget item with subcategories
      for (const item of itemsWithSubcategories) {
        const parentCode = item.cost_codes?.code;
        const childCodes = childCodesByParentCode[parentCode] || [];
        const itemSelections = selectionsByBudgetItem[item.id] || [];
        
        let total = 0;
        
        for (const childCode of childCodes) {
          const selection = itemSelections.find(s => s.cost_code_id === childCode.id);
          const isIncluded = selection?.included ?? true; // Default to included
          
          if (isIncluded) {
            const budgetItem = budgetItemsByCostCode[childCode.id];
            // Use budget item values if they exist, otherwise fall back to cost code defaults
            const quantity = budgetItem?.quantity ?? (childCode.quantity ? parseFloat(childCode.quantity) : 1);
            const unitPrice = budgetItem?.unit_price ?? (childCode.price || 0);
            total += (quantity || 0) * (unitPrice || 0);
          }
        }
        
        subcategoryTotalsMap[item.id] = total;
      }

      return subcategoryTotalsMap;
    },
    enabled: !!projectId && budgetItems.length > 0,
  });
}
