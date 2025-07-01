
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBiddingMutations = (projectId: string) => {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update bidding item
  const updateBiddingItem = useMutation({
    mutationFn: async ({ id, quantity, unit_price }: { id: string; quantity: number; unit_price: number }) => {
      const { error } = await supabase
        .from('project_bidding')
        .update({
          quantity,
          unit_price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
    },
    onError: (error) => {
      console.error('Error updating bidding item:', error);
      toast({
        title: "Error",
        description: "Failed to update bidding item",
        variant: "destructive",
      });
    },
  });

  // Delete bidding item
  const deleteBiddingItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('project_bidding')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bidding item deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting bidding item:', error);
      toast({
        title: "Error",
        description: "Failed to delete bidding item",
        variant: "destructive",
      });
    },
  });

  // Delete bidding group (all items in a group)
  const deleteBiddingGroup = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { error } = await supabase
        .from('project_bidding')
        .delete()
        .in('id', itemIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bidding group deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting bidding group:', error);
      toast({
        title: "Error",
        description: "Failed to delete bidding group",
        variant: "destructive",
      });
    },
  });

  const handleUpdateItem = (id: string, quantity: number, unit_price: number) => {
    updateBiddingItem.mutate({ id, quantity, unit_price });
  };

  const handleDeleteItem = (itemId: string) => {
    setDeletingItems(prev => new Set(prev).add(itemId));
    deleteBiddingItem.mutate(itemId, {
      onSettled: () => {
        setDeletingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      },
    });
  };

  const handleDeleteGroup = (group: string, groupItems: any[]) => {
    setDeletingGroups(prev => new Set(prev).add(group));
    const itemIds = groupItems.map(item => item.id);
    deleteBiddingGroup.mutate(itemIds, {
      onSettled: () => {
        setDeletingGroups(prev => {
          const newSet = new Set(prev);
          newSet.delete(group);
          return newSet;
        });
      },
    });
  };

  return {
    deletingGroups,
    deletingItems,
    handleUpdateItem,
    handleDeleteItem,
    handleDeleteGroup,
  };
};
