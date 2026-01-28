import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

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

  // Cancel and delete purchase order (sends cancellation email first)
  const cancelAndDeletePurchaseOrder = useMutation({
    mutationFn: async (purchaseOrder: PurchaseOrder) => {
      // Step 1: Fetch all necessary data for the cancellation email
      const [projectResult, senderResult] = await Promise.all([
        supabase
          .from('projects')
          .select('address, owner_id')
          .eq('id', purchaseOrder.project_id)
          .maybeSingle(),
        supabase
          .from('users')
          .select('company_name')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()
      ]);

      const projectAddress = projectResult.data?.address || 'Project Address';
      const senderCompanyName = senderResult.data?.company_name || 'Builder Suite AI';

      // Step 2: Send cancellation email
      const { error: emailError } = await supabase.functions.invoke('send-po-email', {
        body: {
          purchaseOrderId: purchaseOrder.id,
          companyId: purchaseOrder.company_id,
          poNumber: purchaseOrder.po_number,
          projectAddress,
          companyName: purchaseOrder.companies?.company_name || 'Company',
          senderCompanyName,
          totalAmount: purchaseOrder.total_amount,
          costCode: purchaseOrder.cost_codes ? {
            code: purchaseOrder.cost_codes.code,
            name: purchaseOrder.cost_codes.name
          } : undefined,
          files: purchaseOrder.files || [],
          isCancellation: true, // This triggers the cancellation email template
        }
      });

      if (emailError) {
        console.error('Error sending cancellation email:', emailError);
        throw new Error('Failed to send cancellation email');
      }

      // Step 3: Delete the PO from the database
      const { error: deleteError } = await supabase
        .from('project_purchase_orders')
        .delete()
        .eq('id', purchaseOrder.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Purchase order canceled and notification sent",
      });
    },
    onError: (error) => {
      console.error('Error canceling purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to cancel purchase order",
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

  const handleCancelAndDeleteItem = (purchaseOrder: PurchaseOrder) => {
    setDeletingItems(prev => new Set(prev).add(purchaseOrder.id));
    cancelAndDeletePurchaseOrder.mutate(purchaseOrder, {
      onSettled: () => {
        setDeletingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(purchaseOrder.id);
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
    handleCancelAndDeleteItem,
    handleDeleteGroup,
    handleUpdateStatus,
    handleUpdateNotes,
  };
};