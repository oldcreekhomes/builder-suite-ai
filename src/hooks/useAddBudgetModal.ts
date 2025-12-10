
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    
    // Get ALL parents from the full cost_codes list (not just available ones)
    // This ensures children can be added even when parent is already in budget
    const allParents = costCodes.filter(cc => !cc.parent_group && !cc.code.includes('.'));
    
    // Get available children only
    const availableChildren = availableCostCodes.filter(cc => cc.parent_group);
    
    // Group available children by their parent code (using ALL parents)
    const grouped: Record<string, CostCode[]> = {};
    
    allParents.forEach(parent => {
      const childrenForParent = availableChildren
        .filter(child => child.parent_group === parent.code)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      
      // Include group if it has available children OR parent itself is available
      if (childrenForParent.length > 0 || !existingCostCodeIds.includes(parent.id)) {
        grouped[parent.code] = childrenForParent;
      }
    });
    
    return grouped;
  }, [costCodes, existingCostCodeIds]);

  // Track which parent codes are already in the budget
  const parentsInBudget = useMemo(() => {
    return new Set(
      costCodes
        .filter(cc => !cc.parent_group && existingCostCodeIds.includes(cc.id))
        .map(cc => cc.id)
    );
  }, [costCodes, existingCostCodeIds]);

  const handleCostCodeToggle = useCallback((costCodeId: string, checked: boolean) => {
    setSelectedCostCodes(prev => {
      const newSelected = new Set(prev);
      
      // Find if this is a parent code
      const toggledCode = costCodes.find(cc => cc.id === costCodeId);
      const isParent = toggledCode && Object.keys(groupedCostCodes).includes(toggledCode.code);
      
      if (checked) {
        newSelected.add(costCodeId);
        
        // If it's a parent, also select all its children
        if (isParent && toggledCode) {
          const children = groupedCostCodes[toggledCode.code] || [];
          children.forEach(child => newSelected.add(child.id));
        }
      } else {
        newSelected.delete(costCodeId);
        
        // If it's a parent, also deselect all its children
        if (isParent && toggledCode) {
          const children = groupedCostCodes[toggledCode.code] || [];
          children.forEach(child => newSelected.delete(child.id));
        }
      }
      
      return newSelected;
    });
  }, [costCodes, groupedCostCodes]);

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

  const handleGroupToggle = useCallback((groupCode: string) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupCode)) {
        newExpanded.delete(groupCode);
      } else {
        newExpanded.add(groupCode);
      }
      return newExpanded;
    });
  }, []);

  return {
    selectedCostCodes,
    groupedCostCodes,
    expandedGroups,
    costCodes,
    parentsInBudget,
    createBudgetItems,
    handleCostCodeToggle,
    handleGroupToggle,
    handleSave,
    resetSelection,
  };
}
