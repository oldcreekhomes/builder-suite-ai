import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePurchaseOrderMutations = (projectId: string) => {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Delete purchase order
  const deletePurchaseOrder = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('project_purchase_orders')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  // Delete purchase order group (all items in a group)
  const deletePurchaseOrderGroup = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { error } = await supabase
        .from('project_purchase_orders')
        .delete()
        .in('id', itemIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order group deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting purchase order group:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order group",
        variant: "destructive",
      });
    },
  });

  const handleDeleteItem = (itemId: string) => {
    setDeletingItems(prev => new Set(prev).add(itemId));
    deletePurchaseOrder.mutate(itemId, {
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
    deletePurchaseOrderGroup.mutate(itemIds, {
      onSettled: () => {
        setDeletingGroups(prev => {
          const newSet = new Set(prev);
          newSet.delete(group);
          return newSet;
        });
      },
    });
  };

  // Update purchase order status
  const updatePurchaseOrderStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { error } = await supabase
        .from('project_purchase_orders')
        .update({ status })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating purchase order status:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order status",
        variant: "destructive",
      });
    },
  });

  // Update purchase order notes
  const updatePurchaseOrderNotes = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      const { error } = await supabase
        .from('project_purchase_orders')
        .update({ notes })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order notes updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating purchase order notes:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order notes",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (itemId: string, status: string) => {
    updatePurchaseOrderStatus.mutate({ itemId, status });
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    updatePurchaseOrderNotes.mutate({ itemId, notes });
  };

  return {
    deletingGroups,
    deletingItems,
    handleDeleteItem,
    handleDeleteGroup,
    handleUpdateStatus,
    handleUpdateNotes,
  };
};