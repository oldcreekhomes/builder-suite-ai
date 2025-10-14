
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

  // Build hierarchy: identify top-level parents and group all descendants under them
  const topLevelParents = costCodes.filter(cc => 
    !existingCostCodeIds.includes(cc.id) && 
    (!cc.parent_group || cc.parent_group.trim() === '')
  );

  const groupedCostCodes = topLevelParents.reduce((acc, parent) => {
    // Get all descendants of this parent (direct children and grandchildren)
    const getAllDescendants = (parentCode: string): CostCode[] => {
      const directChildren = costCodes.filter(cc => 
        !existingCostCodeIds.includes(cc.id) && 
        cc.parent_group === parentCode
      );
      
      const allDescendants = [...directChildren];
      
      // Recursively get descendants of each child
      directChildren.forEach(child => {
        if (child.has_subcategories) {
          allDescendants.push(...getAllDescendants(child.code));
        }
      });
      
      return allDescendants;
    };
    
    const descendants = getAllDescendants(parent.code);
    
    // Only include this group if it has descendants
    if (descendants.length > 0) {
      acc[parent.code] = descendants;
    }
    
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
