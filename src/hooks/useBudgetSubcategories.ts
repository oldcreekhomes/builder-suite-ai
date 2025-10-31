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

  // Fetch subcategories (child cost codes)
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
      const { data: childCodes, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('parent_group', parentCode.code);

      if (error) throw error;
      if (!childCodes || childCodes.length === 0) return [];

      // Get budget items for these child cost codes (if they exist)
      const { data: budgetItems } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .in('cost_code_id', childCodes.map(c => c.id));

      // Map child codes to include budget data if available
      return childCodes.map(costCode => {
        const budgetItem = budgetItems?.find(b => b.cost_code_id === costCode.id);
        return {
          id: budgetItem?.id || costCode.id,
          cost_code_id: costCode.id,
          project_id: projectId,
          quantity: budgetItem?.quantity || (costCode.quantity ? parseFloat(costCode.quantity) : 1),
          unit_price: budgetItem?.unit_price || costCode.price || 0,
          actual_amount: budgetItem?.actual_amount || 0,
          created_at: budgetItem?.created_at || new Date().toISOString(),
          updated_at: budgetItem?.updated_at || new Date().toISOString(),
          cost_codes: costCode,
        };
      }) as BudgetItem[];
    },
    enabled: enabled,
    placeholderData: (prev) => prev,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    placeholderData: (prev) => prev,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  // Mutation to update subcategory quantity
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ budgetId, costCodeId, quantity }: { budgetId: string; costCodeId: string; quantity: number }) => {
      // Check if this budget item exists in project_budgets
      const { data: existing } = await supabase
        .from('project_budgets')
        .select('id')
        .eq('id', budgetId)
        .single();

      if (existing) {
        // Update existing budget item
        const { error } = await supabase
          .from('project_budgets')
          .update({ quantity })
          .eq('id', budgetId);

        if (error) throw error;
      } else {
        // Create new budget item
        const subcategory = subcategories.find(s => s.cost_code_id === costCodeId);
        if (!subcategory) throw new Error('Subcategory not found');

        const { error } = await supabase
          .from('project_budgets')
          .insert({
            project_id: projectId,
            cost_code_id: costCodeId,
            quantity,
            unit_price: subcategory.unit_price,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-subcategories', projectId, costCodeId] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
    },
  });

  const toggleSubcategory = (costCodeId: string, included: boolean) => {
    setSelections(prev => ({ ...prev, [costCodeId]: included }));
    updateSelectionMutation.mutate({ costCodeId, included });
  };

  const updateQuantity = (budgetId: string, costCodeId: string, quantity: number) => {
    updateQuantityMutation.mutate({ budgetId, costCodeId, quantity });
  };

  // Calculate total based on selections
  const calculatedTotal = subcategories.reduce((sum, sub) => {
    const isSelected = selections[sub.cost_codes.id] !== false;
    if (isSelected) {
      return sum + ((sub.unit_price || 0) * (sub.quantity || 0));
    }
    return sum;
  }, 0);

  return {
    subcategories,
    selections,
    toggleSubcategory,
    updateQuantity,
    calculatedTotal,
    isLoading,
  };
}
