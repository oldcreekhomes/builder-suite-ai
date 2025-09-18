
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  uploading: boolean;
  itemId: string;
  xhr?: XMLHttpRequest;
}

export const useBiddingMutations = (projectId: string) => {
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
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

  // File validation helper
  const isValidFile = (file: File) => {
    const fileName = file.name;
    const systemFiles = ['.DS_Store', 'Thumbs.db'];
    const hiddenFiles = fileName.startsWith('.');

    if (fileName === '.gitignore' || fileName === '.gitkeep') {
      return true;
    }

    if (systemFiles.includes(fileName) || hiddenFiles && fileName !== '.gitignore' && fileName !== '.gitkeep') {
      return false;
    }

    if (file.size === 0) {
      return false;
    }

    // Check file size limit
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "ERROR",
        description: "File over 50 MB's. Please reduce file size.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  // Upload single file with progress tracking
  const uploadFileWithProgress = async (file: File, itemId: string, uploadId: string): Promise<boolean> => {
    const fileName = `bidding_${itemId}_${Date.now()}_${file.name}`;
    const filePath = `specifications/${fileName}`;
    
    try {
      // Get signed upload URL
      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from('project-files')
        .createSignedUploadUrl(filePath);
      
      if (signedUrlError) throw signedUrlError;

      return new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        
        // Update the upload item with xhr reference
        setUploadingFiles(prev => 
          prev.map(item => 
            item.id === uploadId ? { ...item, xhr, uploading: true } : item
          )
        );

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 80); // Use 80% for upload progress
            setUploadingFiles(prev => 
              prev.map(item => 
                item.id === uploadId ? { ...item, progress } : item
              )
            );
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              // Update progress for database save
              setUploadingFiles(prev => 
                prev.map(item => 
                  item.id === uploadId ? { ...item, progress: 90 } : item
                )
              );

              // Get current files array and append new file
              const { data: currentData, error: fetchError } = await supabase
                .from('project_bid_packages')
                .select('files')
                .eq('id', itemId)
                .single();
                
              if (fetchError) throw fetchError;
              
              const currentFiles = currentData?.files || [];
              const updatedFiles = [...currentFiles, fileName];
              
              const { error } = await supabase
                .from('project_bid_packages')
                .update({ files: updatedFiles })
                .eq('id', itemId);

              if (error) throw error;

              // Update progress to complete
              setUploadingFiles(prev => 
                prev.map(item => 
                  item.id === uploadId ? { ...item, progress: 100, uploading: false, xhr: undefined } : item
                )
              );
              
              // Remove from list after a short delay
              setTimeout(() => {
                setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
              }, 2000);

              resolve(true);
            } catch (error) {
              console.error('Database error:', error);
              
              setUploadingFiles(prev => 
                prev.map(item => 
                  item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
                )
              );
              
              toast({
                title: "Upload Error",
                description: `Failed to save ${file.name} to database`,
                variant: "destructive",
              });
              resolve(false);
            }
          } else {
            // Upload failed
            setUploadingFiles(prev => 
              prev.map(item => 
                item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
              )
            );
            
            toast({
              title: "Upload Error",
              description: `Failed to upload ${file.name}`,
              variant: "destructive",
            });
            resolve(false);
          }
        });

        xhr.addEventListener('error', () => {
          setUploadingFiles(prev => 
            prev.map(item => 
              item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
            )
          );
          
          toast({
            title: "Upload Error",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          resolve(false);
        });

        xhr.open('PUT', signedUrl);
        xhr.send(file);
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      setUploadingFiles(prev => 
        prev.map(item => 
          item.id === uploadId ? { ...item, progress: 0, uploading: false, xhr: undefined } : item
        )
      );
      
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
      return false;
    }
  };

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

  const handleFileUpload = async (itemId: string, files: File[]) => {
    const validFiles = files.filter(isValidFile);
    if (validFiles.length === 0) {
      // Don't show generic "No Valid Files" message if files were rejected due to size
      const hasOversizedFiles = files.some(f => f.size > MAX_FILE_SIZE);
      if (!hasOversizedFiles) {
        toast({
          title: "No Valid Files",
          description: "No valid files found to upload",
          variant: "destructive",
        });
      }
      return;
    }

    // Add files to upload queue with initial progress
    const uploadItems: UploadingFile[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      uploading: true,
      itemId,
      xhr: undefined
    }));

    setUploadingFiles(prev => [...prev, ...uploadItems]);
    
    toast({
      title: "Upload Started",
      description: `Starting upload of ${validFiles.length} file(s)`,
    });

    // Upload files one by one
    let successCount = 0;
    for (const uploadItem of uploadItems) {
      const success = await uploadFileWithProgress(uploadItem.file, itemId, uploadItem.id);
      if (success) successCount++;
    }

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} of ${validFiles.length} file(s)`,
      });
    }
  };

  const cancelUpload = (uploadId: string) => {
    setUploadingFiles(prev => {
      const upload = prev.find(item => item.id === uploadId);
      if (upload?.xhr) {
        upload.xhr.abort();
      }
      return prev.filter(item => item.id !== uploadId);
    });
  };

  const removeUpload = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
  };

  const handleDeleteFiles = (itemId: string) => {
    deleteBiddingFiles.mutate(itemId);
  };

  return {
    deletingGroups,
    deletingItems,
    uploadingFiles,
    handleDeleteItem,
    handleDeleteGroup,
    handleUpdateStatus,
    handleUpdateDueDate,
    handleUpdateReminderDate,
    handleUpdateSpecifications,
    handleFileUpload,
    handleDeleteFiles,
    cancelUpload,
    removeUpload,
  };
};
