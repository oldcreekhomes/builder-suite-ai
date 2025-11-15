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

export function useJournalEntryAttachments(journalEntryId: string | null) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['journal-entry-attachments', journalEntryId],
    queryFn: async () => {
      if (!journalEntryId) return [];
      
      const { data, error } = await supabase
        .from('journal_entry_attachments')
        .select('*')
        .eq('journal_entry_id', journalEntryId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!journalEntryId,
  });

  const uploadFiles = async (files: File[]) => {
    if (!journalEntryId) {
      toast({
        title: "Error",
        description: "Please save the journal entry first before attaching files",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      for (const file of files) {
        // Validate file size (20MB max)
        if (file.size > 20 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 20MB limit`,
            variant: "destructive",
          });
          continue;
        }

        // Upload to storage
        const filePath = `journal-entry-attachments/${journalEntryId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('journal_entry_attachments')
          .insert({
            journal_entry_id: journalEntryId,
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

      queryClient.invalidateQueries({ queryKey: ['journal-entry-attachments', journalEntryId] });
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
      // Get file path first
      const { data: attachment } = await supabase
        .from('journal_entry_attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .single();

      if (!attachment) throw new Error('Attachment not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('journal_entry_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['journal-entry-attachments', journalEntryId] });
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
