
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBiddingMutations = (projectId: string) => {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Update bidding item status
  const updateBiddingStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { error } = await supabase
        .from('project_bidding')
        .update({ status })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bidding status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating bidding status:', error);
      toast({
        title: "Error",
        description: "Failed to update bidding status",
        variant: "destructive",
      });
    },
  });

  // Update bidding item due date
  const updateBiddingDueDate = useMutation({
    mutationFn: async ({ itemId, dueDate }: { itemId: string; dueDate: string | null }) => {
      const { error } = await supabase
        .from('project_bidding')
        .update({ due_date: dueDate })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Due date updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating due date:', error);
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    },
  });

  // Update bidding item reminder date
  const updateBiddingReminderDate = useMutation({
    mutationFn: async ({ itemId, reminderDate }: { itemId: string; reminderDate: string | null }) => {
      const { error } = await supabase
        .from('project_bidding')
        .update({ reminder_date: reminderDate })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Reminder date updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating reminder date:', error);
      toast({
        title: "Error",
        description: "Failed to update reminder date",
        variant: "destructive",
      });
    },
  });

  // Update bidding item specifications
  const updateBiddingSpecifications = useMutation({
    mutationFn: async ({ itemId, specifications }: { itemId: string; specifications: string }) => {
      const { error } = await supabase
        .from('project_bidding')
        .update({ specifications })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Specifications updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating specifications:', error);
      toast({
        title: "Error",
        description: "Failed to update specifications",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (itemId: string, status: string) => {
    updateBiddingStatus.mutate({ itemId, status });
  };

  const handleUpdateDueDate = (itemId: string, dueDate: string | null) => {
    updateBiddingDueDate.mutate({ itemId, dueDate });
  };

  const handleUpdateReminderDate = (itemId: string, reminderDate: string | null) => {
    updateBiddingReminderDate.mutate({ itemId, reminderDate });
  };

  const handleUpdateSpecifications = (itemId: string, specifications: string) => {
    updateBiddingSpecifications.mutate({ itemId, specifications });
  };

  return {
    deletingGroups,
    deletingItems,
    handleDeleteItem,
    handleDeleteGroup,
    handleUpdateStatus,
    handleUpdateDueDate,
    handleUpdateReminderDate,
    handleUpdateSpecifications,
  };
};
