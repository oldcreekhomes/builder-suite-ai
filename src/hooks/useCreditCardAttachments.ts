import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string | null;
  uploaded_at: string;
}

export function useCreditCardAttachments(creditCardId: string | null, draftId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['credit-card-attachments', creditCardId],
    queryFn: async () => {
      if (!creditCardId) return [];
      
      const { data, error } = await supabase
        .from('credit_card_attachments')
        .select('*')
        .eq('credit_card_id', creditCardId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!creditCardId,
  });

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const newPendingAttachments: Attachment[] = [];
      
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 20MB limit`,
            variant: "destructive",
          });
          continue;
        }

        const tempId = creditCardId || draftId;
        const filePath = `credit-card-attachments/${tempId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        if (creditCardId) {
          // If we have a credit card ID, save to database
          const { error: dbError } = await supabase
            .from('credit_card_attachments')
            .insert({
              credit_card_id: creditCardId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: user?.id,
            });

          if (dbError) throw dbError;
        } else {
          // Otherwise, track as pending
          newPendingAttachments.push({
            id: filePath,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type,
            uploaded_at: new Date().toISOString(),
          });
        }
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });

      if (creditCardId) {
        queryClient.invalidateQueries({ queryKey: ['credit-card-attachments', creditCardId] });
      } else {
        setPendingAttachments(prev => [...prev, ...newPendingAttachments]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (attachmentId: string) => {
    try {
      const isPending = pendingAttachments.some(a => a.id === attachmentId);
      
      if (isPending) {
        const attachment = pendingAttachments.find(a => a.id === attachmentId);
        if (attachment) {
          const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([attachment.file_path]);
          if (storageError) throw storageError;
        }
        setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
      } else {
        const { data: attachment } = await supabase
          .from('credit_card_attachments')
          .select('file_path')
          .eq('id', attachmentId)
          .single();

        if (!attachment) throw new Error('Attachment not found');

        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([attachment.file_path]);

        if (storageError) throw storageError;

        const { error: dbError } = await supabase
          .from('credit_card_attachments')
          .delete()
          .eq('id', attachmentId);

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['credit-card-attachments', creditCardId] });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const finalizePendingAttachments = async (finalCreditCardId: string) => {
    if (pendingAttachments.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      for (const attachment of pendingAttachments) {
        await supabase
          .from('credit_card_attachments')
          .insert({
            credit_card_id: finalCreditCardId,
            file_name: attachment.file_name,
            file_path: attachment.file_path,
            file_size: attachment.file_size,
            content_type: attachment.content_type,
            uploaded_by: user?.id,
          });
      }
      setPendingAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['credit-card-attachments', finalCreditCardId] });
    } catch (error) {
      console.error('Error finalizing attachments:', error);
    }
  };

  const allAttachments = [...pendingAttachments, ...attachments];

  return {
    attachments: allAttachments,
    isLoading,
    isUploading,
    uploadFiles,
    deleteFile,
    finalizePendingAttachments,
  };
}
