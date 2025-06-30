
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

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

  // Group cost codes by parent group, excluding uncategorized and existing cost codes
  const groupedCostCodes = costCodes.reduce((acc, costCode) => {
    // Skip cost codes that are already in the budget
    if (existingCostCodeIds.includes(costCode.id)) {
      return acc;
    }

    // Skip uncategorized items
    const group = costCode.parent_group;
    if (!group || group.toLowerCase() === 'uncategorized') {
      return acc;
    }

    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(costCode);
    return acc;
  }, {} as Record<string, CostCode[]>);

  const handleCostCodeToggle = (costCodeId: string, checked: boolean) => {
    const newSelected = new Set(selectedCostCodes);
    if (checked) {
      newSelected.add(costCodeId);
    } else {
      newSelected.delete(costCodeId);
    }
    setSelectedCostCodes(newSelected);
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const newSelected = new Set(selectedCostCodes);
    
    if (checked) {
      // Select all items in this group
      groupCostCodes.forEach(costCode => newSelected.add(costCode.id));
    } else {
      // Deselect all items in this group
      groupCostCodes.forEach(costCode => newSelected.delete(costCode.id));
    }
    
    setSelectedCostCodes(newSelected);
  };

  const isGroupSelected = (group: string) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    return groupCostCodes.length > 0 && groupCostCodes.every(costCode => selectedCostCodes.has(costCode.id));
  };

  const isGroupPartiallySelected = (group: string) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const selectedInGroup = groupCostCodes.filter(costCode => selectedCostCodes.has(costCode.id));
    return selectedInGroup.length > 0 && selectedInGroup.length < groupCostCodes.length;
  };

  const handleExpandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedCostCodes)));
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleGroupToggle = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSave = () => {
    if (selectedCostCodes.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one cost code to add to the budget.",
        variant: "destructive",
      });
      return;
    }
    createBudgetItems.mutate(Array.from(selectedCostCodes));
  };

  const resetSelection = () => {
    setSelectedCostCodes(new Set());
  };

  return {
    selectedCostCodes,
    expandedGroups,
    groupedCostCodes,
    createBudgetItems,
    handleCostCodeToggle,
    handleGroupCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    handleExpandAll,
    handleCollapseAll,
    handleGroupToggle,
    handleSave,
    resetSelection,
  };
}
