
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export const useAddBiddingModal = (projectId: string, existingCostCodeIds: string[]) => {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch cost codes that have bidding enabled and aren't already in the project
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes-bidding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('has_bidding', true)
        .order('parent_group', { ascending: true })
        .order('code', { ascending: true });

      if (error) {
        console.error('Error fetching cost codes:', error);
        throw error;
      }

      // Filter out cost codes that are already in the project bidding
      return (data || []).filter(code => !existingCostCodeIds.includes(code.id));
    },
  });

  // Group cost codes by parent_group or category
  const groupedCostCodes = costCodes.reduce((acc, code) => {
    const group = code.parent_group || code.category || 'Uncategorized';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(code);
    return acc;
  }, {} as Record<string, CostCode[]>);

  // Create bidding items mutation
  const createBiddingItems = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      const biddingItems = costCodeIds.map(costCodeId => ({
        project_id: projectId,
        cost_code_id: costCodeId,
        quantity: 0,
        unit_price: 0,
      }));

      const { error } = await supabase
        .from('project_bidding')
        .insert(biddingItems);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-bidding'] });
      toast({
        title: "Success",
        description: "Bid package loaded successfully",
      });
      resetSelection();
    },
    onError: (error) => {
      console.error('Error creating bidding items:', error);
      toast({
        title: "Error",
        description: "Failed to load bid package",
        variant: "destructive",
      });
    },
  });

  const handleCostCodeToggle = (costCodeId: string) => {
    setSelectedCostCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(costCodeId)) {
        newSet.delete(costCodeId);
      } else {
        newSet.add(costCodeId);
      }
      return newSet;
    });
  };

  const handleGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupCodes = groupedCostCodes[group] || [];
    setSelectedCostCodes(prev => {
      const newSet = new Set(prev);
      groupCodes.forEach(code => {
        if (checked) {
          newSet.add(code.id);
        } else {
          newSet.delete(code.id);
        }
      });
      return newSet;
    });
  };

  const isGroupSelected = (group: string) => {
    const groupCodes = groupedCostCodes[group] || [];
    return groupCodes.length > 0 && groupCodes.every(code => selectedCostCodes.has(code.id));
  };

  const isGroupPartiallySelected = (group: string) => {
    const groupCodes = groupedCostCodes[group] || [];
    return groupCodes.some(code => selectedCostCodes.has(code.id)) && !isGroupSelected(group);
  };

  const handleExpandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedCostCodes)));
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleGroupToggle = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    if (selectedCostCodes.size > 0) {
      createBiddingItems.mutate(Array.from(selectedCostCodes));
    }
  };

  const resetSelection = () => {
    setSelectedCostCodes(new Set());
    setExpandedGroups(new Set());
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
