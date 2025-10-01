import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useState, useEffect } from 'react';

type CostCode = Tables<'cost_codes'>;
type BudgetItem = Tables<'project_budgets'> & {
  cost_codes: CostCode;
};

export function useBudgetSubcategories(
  budgetItemId: string,
  costCodeId: string,
  projectId: string,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<Record<string, boolean>>({});

  // Fetch subcategories (child cost codes and their budget items)
  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ['budget-subcategories', projectId, costCodeId],
    queryFn: async () => {
      // First get the parent cost code to find its code
      const { data: parentCode } = await supabase
        .from('cost_codes')
        .select('code')
        .eq('id', costCodeId)
        .single();

      if (!parentCode) return [];

      // Get child cost codes where parent_group matches parent code
      const { data: childCodes } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('parent_group', parentCode.code);

      if (!childCodes || childCodes.length === 0) return [];

      // Get budget items for these child cost codes
      const { data: budgetItems, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes (*)
        `)
        .eq('project_id', projectId)
        .in('cost_code_id', childCodes.map(c => c.id));

      if (error) throw error;
      return budgetItems as BudgetItem[];
    },
    enabled: enabled,
  });

  // Fetch saved selections
  const { data: savedSelections = [] } = useQuery({
    queryKey: ['budget-subcategory-selections', budgetItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_subcategory_selections')
        .select('*')
        .eq('project_budget_id', budgetItemId);

      if (error) throw error;
      return data;
    },
    enabled: enabled,
  });

  // Initialize selections when data loads
  useEffect(() => {
    if (subcategories.length > 0) {
      const newSelections: Record<string, boolean> = {};
      
      subcategories.forEach((sub) => {
        const saved = savedSelections.find(s => s.cost_code_id === sub.cost_codes.id);
        newSelections[sub.cost_codes.id] = saved ? saved.included : true; // Default to true
      });
      
      setSelections(newSelections);
    }
  }, [subcategories, savedSelections]);

  // Mutation to update selection
  const updateSelectionMutation = useMutation({
    mutationFn: async ({ costCodeId, included }: { costCodeId: string; included: boolean }) => {
      const { error } = await supabase
        .from('budget_subcategory_selections')
        .upsert({
          project_budget_id: budgetItemId,
          cost_code_id: costCodeId,
          included,
        }, {
          onConflict: 'project_budget_id,cost_code_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-subcategory-selections', budgetItemId] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
    },
  });

  const toggleSubcategory = (costCodeId: string, included: boolean) => {
    setSelections(prev => ({ ...prev, [costCodeId]: included }));
    updateSelectionMutation.mutate({ costCodeId, included });
  };

  // Calculate total based on selections
  const calculatedTotal = subcategories.reduce((sum, sub) => {
    const isSelected = selections[sub.cost_codes.id] !== false;
    if (isSelected) {
      return sum + ((sub.unit_price || 0) * (sub.quantity || 1));
    }
    return sum;
  }, 0);

  return {
    subcategories,
    selections,
    toggleSubcategory,
    calculatedTotal,
    isLoading,
  };
}
