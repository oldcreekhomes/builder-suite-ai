import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type BudgetItem = Tables<'project_budgets'>;
type CostCode = Tables<'cost_codes'>;

interface SubcategoryWithBudget {
  costCode: CostCode;
  budgetItem: BudgetItem;
}

export function useBudgetSubcategories(
  parentBudgetId: string,
  parentCostCode: string,
  projectId: string
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subcategories (child cost codes and their budget items)
  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ['budget-subcategories', parentCostCode, projectId],
    queryFn: async () => {
      if (!parentCostCode) return [];

      // Get child cost codes
      const { data: childCostCodes, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('parent_group', parentCostCode);

      if (costCodesError) throw costCodesError;
      if (!childCostCodes || childCostCodes.length === 0) return [];

      // Get budget items for these cost codes
      const childCostCodeIds = childCostCodes.map(cc => cc.id);
      const { data: budgetItems, error: budgetError } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .in('cost_code_id', childCostCodeIds);

      if (budgetError) throw budgetError;

      // Combine cost codes with their budget items
      const result: SubcategoryWithBudget[] = [];
      for (const costCode of childCostCodes) {
        const budgetItem = budgetItems?.find(b => b.cost_code_id === costCode.id);
        if (budgetItem) {
          result.push({ costCode, budgetItem });
        }
      }

      return result;
    },
    enabled: !!parentCostCode && !!projectId,
  });

  // Fetch selections
  const { data: selectionsData = [] } = useQuery({
    queryKey: ['budget-subcategory-selections', parentBudgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_subcategory_selections')
        .select('*')
        .eq('project_budget_id', parentBudgetId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!parentBudgetId,
  });

  // Create a map of selections for easy lookup
  const selections: Record<string, boolean> = {};
  subcategories.forEach(sub => {
    const selection = selectionsData.find(s => s.cost_code_id === sub.costCode.id);
    // Default to true if no selection exists
    selections[sub.budgetItem.id] = selection ? selection.included : true;
  });

  // Toggle selection mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ budgetItemId, costCodeId }: { budgetItemId: string; costCodeId: string }) => {
      const currentSelection = selectionsData.find(s => s.cost_code_id === costCodeId);
      
      if (currentSelection) {
        // Update existing selection
        const { error } = await supabase
          .from('budget_subcategory_selections')
          .update({ included: !currentSelection.included })
          .eq('id', currentSelection.id);
        
        if (error) throw error;
      } else {
        // Create new selection (default was true, so now setting to false)
        const { error } = await supabase
          .from('budget_subcategory_selections')
          .insert({
            project_budget_id: parentBudgetId,
            cost_code_id: costCodeId,
            included: false,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-subcategory-selections', parentBudgetId] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
    },
    onError: (error) => {
      console.error('Error updating subcategory selection:', error);
      toast({
        title: "Error",
        description: "Failed to update subcategory selection",
        variant: "destructive",
      });
    },
  });

  // Calculate total based on selections
  const calculatedTotal = subcategories.reduce((total, sub) => {
    const isIncluded = selections[sub.budgetItem.id] ?? true;
    if (isIncluded) {
      const subtotal = (sub.budgetItem.quantity || 0) * (sub.budgetItem.unit_price || 0);
      return total + subtotal;
    }
    return total;
  }, 0);

  return {
    subcategories,
    selections,
    toggleSelection: (budgetItemId: string, costCodeId: string) => 
      toggleMutation.mutate({ budgetItemId, costCodeId }),
    calculatedTotal,
    isLoading,
  };
}
