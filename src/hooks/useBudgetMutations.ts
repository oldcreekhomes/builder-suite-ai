
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBudgetMutations(projectId: string) {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
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

  const handleDeleteGroup = (group: string, groupItems: any[]) => {
    setDeletingGroups(prev => new Set([...prev, group]));
    deleteGroupMutation.mutate({ group, groupItems });
  };

  return {
    deletingGroups,
    handleUpdateItem,
    handleDeleteGroup
  };
}
