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

export function useCreditCardAttachments(creditCardId: string | null) {
  const [isUploading, setIsUploading] = useState(false);
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
    if (!creditCardId) {
      toast({
        title: "Save Required",
        description: "Please save the credit card transaction before uploading files",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 20MB limit`,
            variant: "destructive",
          });
          continue;
        }

        const filePath = `credit-card-attachments/${creditCardId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

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
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['credit-card-attachments', creditCardId] });
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

  return {
    attachments,
    isLoading,
    isUploading,
    uploadFiles,
    deleteFile,
  };
}
