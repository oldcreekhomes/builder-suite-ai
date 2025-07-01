
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CostCode {
  id: string;
  code: string;
  name: string;
  unit_of_measure: string | null;
  category: string | null;
  parent_group: string | null;
  has_bidding: boolean;
}

export const useAddBiddingModal = (projectId: string, existingCostCodeIds: string[]) => {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupedCostCodes, setGroupedCostCodes] = useState<Record<string, CostCode[]>>({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch cost codes that have bidding enabled and are not already in the project
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes-for-bidding', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('has_bidding', true)
        .not('id', 'in', `(${existingCostCodeIds.join(',') || 'null'})`);

      if (error) {
        console.error('Error fetching cost codes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!projectId,
  });

  // Group cost codes by parent_group or category
  useEffect(() => {
    const grouped = costCodes.reduce((acc, costCode) => {
      const group = costCode.parent_group || costCode.category || 'Uncategorized';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(costCode);
      return acc;
    }, {} as Record<string, CostCode[]>);

    setGroupedCostCodes(grouped);
  }, [costCodes]);

  // Create bidding items mutation
  const createBiddingItems = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      const biddingItems = costCodeIds.map(costCodeId => ({
        project_id: projectId,
        cost_code_id: costCodeId,
        status: 'draft'
      }));

      const { error } = await supabase
        .from('project_bidding')
        .insert(biddingItems);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bidding items added successfully",
      });
      setSelectedCostCodes(new Set());
    },
    onError: (error) => {
      console.error('Error creating bidding items:', error);
      toast({
        title: "Error",
        description: "Failed to create bidding items",
        variant: "destructive",
      });
    },
  });

  const handleCostCodeToggle = (costCodeId: string) => {
    const newSelection = new Set(selectedCostCodes);
    if (newSelection.has(costCodeId)) {
      newSelection.delete(costCodeId);
    } else {
      newSelection.add(costCodeId);
    }
    setSelectedCostCodes(newSelection);
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupCostCodes = groupedCostCodes[group] || [];
    const newSelection = new Set(selectedCostCodes);
    
    groupCostCodes.forEach(costCode => {
      if (checked) {
        newSelection.add(costCode.id);
      } else {
        newSelection.delete(costCode.id);
      }
    });
    
    setSelectedCostCodes(newSelection);
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
    if (selectedCostCodes.size > 0) {
      createBiddingItems.mutate(Array.from(selectedCostCodes));
    }
  };

  const resetSelection = () => {
    setSelectedCostCodes(new Set());
  };

  return {
    selectedCostCodes,
    expandedGroups,
    groupedCostCodes,
    createBiddingItems,
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
};
