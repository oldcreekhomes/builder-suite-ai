
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

// Helper function outside the hook to avoid recreating it
const getIndentLevel = (costCode: CostCode, allCostCodes: CostCode[]): number => {
  if (!costCode.parent_group) return 0;
  
  const parent = allCostCodes.find(cc => cc.code === costCode.parent_group);
  if (!parent) return 0;
  
  return 1 + getIndentLevel(parent, allCostCodes);
};

export function useAddBudgetModal(projectId: string, existingCostCodeIds: string[]) {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch cost codes
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as CostCode[];
    },
  });

  // Create budget items mutation
  const createBudgetItems = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      // Get the selected cost codes with their default values
      const selectedCostCodesData = costCodes.filter(cc => costCodeIds.includes(cc.id));
      
      const budgetItems = selectedCostCodesData.map(costCode => ({
        project_id: projectId,
        cost_code_id: costCode.id,
        quantity: costCode.quantity ? parseFloat(costCode.quantity) : 0,
        unit_price: costCode.price ? parseFloat(costCode.price.toString()) : 0,
      }));

      const { data, error } = await supabase
        .from('project_budgets')
        .insert(budgetItems)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: `Added ${data?.length || 0} budget items successfully`,
      });
      setSelectedCostCodes(new Set());
    },
  });

  // Memoize the grouped cost codes to prevent recreating on every render
  const groupedCostCodes = useMemo(() => {
    // Filter out cost codes already in budget and subcategories (codes with dots)
    const availableCostCodes = costCodes
      .filter(cc => !existingCostCodeIds.includes(cc.id))
      .filter(cc => !cc.code.includes('.')); // Remove subcategories like 2100.1
    
    // Sort cost codes: parents before children, then by code
    const sortedCostCodes = [...availableCostCodes].sort((a, b) => {
      // If different levels and one is parent of the other, parent comes first
      if (a.code === b.parent_group) return -1;
      if (b.code === a.parent_group) return 1;
      
      // If same parent, sort by code
      if (a.parent_group === b.parent_group) {
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      }
      
      // Otherwise sort by code
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });
    
    return { all: sortedCostCodes };
  }, [costCodes, existingCostCodeIds]);

  const handleCostCodeToggle = useCallback((costCodeId: string, checked: boolean) => {
    setSelectedCostCodes(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(costCodeId);
      } else {
        newSelected.delete(costCodeId);
      }
      return newSelected;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (selectedCostCodes.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one cost code to add to the budget.",
        variant: "destructive",
      });
      return;
    }
    createBudgetItems.mutate(Array.from(selectedCostCodes));
  }, [selectedCostCodes, createBudgetItems, toast]);

  const resetSelection = useCallback(() => {
    setSelectedCostCodes(new Set());
  }, []);

  return {
    selectedCostCodes,
    groupedCostCodes,
    costCodes, // Export for indent calculation
    createBudgetItems,
    handleCostCodeToggle,
    handleSave,
    resetSelection,
  };
}
