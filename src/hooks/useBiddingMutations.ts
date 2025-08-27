
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
        .from('project_bid_packages')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-for-bidding', projectId] });
      // Invalidate purchase orders since deleting bid packages also deletes linked POs
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      toast({
        title: "Success",
        description: "Bidding package deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting bidding package:', error);
      toast({
        title: "Error",
        description: "Failed to delete bidding package",
        variant: "destructive",
      });
    },
  });

  // Delete bidding group (all items in a group)
  const deleteBiddingGroup = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { error } = await supabase
        .from('project_bid_packages')
        .delete()
        .in('id', itemIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-for-bidding', projectId] });
      // Invalidate purchase orders since deleting bid packages also deletes linked POs
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
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

  // Update bidding package status
  const updateBiddingStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { error } = await supabase
        .from('project_bid_packages')
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

  // Update bidding package due date
  const updateBiddingDueDate = useMutation({
    mutationFn: async ({ itemId, dueDate }: { itemId: string; dueDate: string | null }) => {
      const { error } = await supabase
        .from('project_bid_packages')
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

  // Update bidding package reminder date
  const updateBiddingReminderDate = useMutation({
    mutationFn: async ({ itemId, reminderDate }: { itemId: string; reminderDate: string | null }) => {
      const { error } = await supabase
        .from('project_bid_packages')
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

  // Update bidding package specifications
  const updateBiddingSpecifications = useMutation({
    mutationFn: async ({ itemId, specifications }: { itemId: string; specifications: string }) => {
      const { error } = await supabase
        .from('project_bid_packages')
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

  // Upload files to bidding package
  const uploadBiddingFiles = useMutation({
    mutationFn: async ({ itemId, files }: { itemId: string; files: File[] }) => {
      const uploadedFileNames: string[] = [];
      
      for (const file of files) {
        const fileName = `bidding_${itemId}_${Date.now()}_${file.name}`;
        const filePath = `specifications/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        uploadedFileNames.push(fileName);
      }
      
      // Get current files array and append new files
      const { data: currentData, error: fetchError } = await supabase
        .from('project_bid_packages')
        .select('files')
        .eq('id', itemId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentFiles = currentData?.files || [];
      const updatedFiles = [...currentFiles, ...uploadedFileNames];
      
      const { error } = await supabase
        .from('project_bid_packages')
        .update({ files: updatedFiles })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: (error) => {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  // Delete all files from bidding package
  const deleteBiddingFiles = useMutation({
    mutationFn: async (itemId: string) => {
      // Get current files to delete from storage
      const { data: currentData, error: fetchError } = await supabase
        .from('project_bid_packages')
        .select('files')
        .eq('id', itemId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentFiles = currentData?.files || [];
      
      // Delete files from storage
      if (currentFiles.length > 0) {
        const filePaths = currentFiles.map((fileName: string) => `specifications/${fileName}`);
        const { error: deleteError } = await supabase.storage
          .from('project-files')
          .remove(filePaths);
          
        if (deleteError) console.error('Error deleting files from storage:', deleteError);
      }
      
      // Clear files array in database
      const { error } = await supabase
        .from('project_bid_packages')
        .update({ files: [] })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Files deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting files:', error);
      toast({
        title: "Error",
        description: "Failed to delete files",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (itemId: string, files: File[]) => {
    uploadBiddingFiles.mutate({ itemId, files });
  };

  const handleDeleteFiles = (itemId: string) => {
    deleteBiddingFiles.mutate(itemId);
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
    handleFileUpload,
    handleDeleteFiles,
  };
};
