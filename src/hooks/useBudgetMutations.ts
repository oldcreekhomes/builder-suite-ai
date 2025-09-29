
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBudgetMutations(projectId: string) {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update budget item mutation
  const updateBudgetItem = useMutation({
    mutationFn: async ({ id, quantity, unit_price }: { id: string; quantity: number; unit_price: number }) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .update({ quantity, unit_price })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: "Budget item updated successfully",
      });
    },
  });

  // Update cost code unit mutation
  const updateCostCodeUnit = useMutation({
    mutationFn: async ({ costCodeId, unit_of_measure }: { costCodeId: string; unit_of_measure: string }) => {
      const { data, error } = await supabase
        .from('cost_codes')
        .update({ unit_of_measure })
        .eq('id', costCodeId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: "Unit of measure updated successfully",
      });
    },
  });

  // Delete individual item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return itemId;
    },
    onSuccess: (itemId) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: "Budget item deleted successfully",
      });
    },
    onError: (error, itemId) => {
      console.error('Error deleting item:', error);
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      toast({
        title: "Error",
        description: "Failed to delete budget item",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async ({ group, groupItems }: { group: string; groupItems: any[] }) => {
      const itemIds = groupItems.map(item => item.id);
      
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .in('id', itemIds);
      
      if (error) throw error;
      return group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      
      setDeletingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(group);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: `All items in "${group}" group have been deleted`,
      });
    },
    onError: (error, { group }) => {
      console.error('Error deleting group:', error);
      setDeletingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(group);
        return newSet;
      });
      toast({
        title: "Error",
        description: `Failed to delete "${group}" group`,
        variant: "destructive",
      });
    },
  });

  const handleUpdateItem = (id: string, quantity: number, unit_price: number) => {
    updateBudgetItem.mutate({ id, quantity, unit_price });
  };

  const handleUpdateUnit = (costCodeId: string, unit_of_measure: string) => {
    updateCostCodeUnit.mutate({ costCodeId, unit_of_measure });
  };

  const handleDeleteItem = (itemId: string) => {
    setDeletingItems(prev => new Set([...prev, itemId]));
    deleteItemMutation.mutate(itemId);
  };

  const handleDeleteGroup = (group: string, groupItems: any[]) => {
    setDeletingGroups(prev => new Set([...prev, group]));
    deleteGroupMutation.mutate({ group, groupItems });
  };

  // Update actual amount mutation
  const updateActualMutation = useMutation({
    mutationFn: async ({ id, actual_amount }: { id: string; actual_amount: number }) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .update({ actual_amount } as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      toast({
        title: "Success",
        description: "Actual amount updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating actual amount:', error);
      toast({
        title: "Error",
        description: "Failed to update actual amount",
        variant: "destructive",
      });
    },
  });

  const handleUpdateActual = (id: string, actual_amount: number) => {
    updateActualMutation.mutate({ id, actual_amount });
  };

  return {
    deletingGroups,
    deletingItems,
    handleUpdateItem,
    handleUpdateUnit,
    handleDeleteItem,
    handleDeleteGroup,
    handleUpdateActual
  };
}
