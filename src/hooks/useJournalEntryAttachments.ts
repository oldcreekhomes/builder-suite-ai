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

export function useJournalEntryAttachments(journalEntryId: string | null, draftId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
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

        if (journalEntryId) {
          // Saved entry: upload and persist to database
          const filePath = `journal-entry-attachments/${journalEntryId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

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
        } else {
          // Draft mode: upload to storage only, track as pending
          const filePath = `journal-entry-attachments/draft-${draftId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Add to pending attachments
          const pendingAttachment: Attachment = {
            id: `pending-${crypto.randomUUID()}`,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type,
            uploaded_at: new Date().toISOString(),
          };
          setPendingAttachments(prev => [...prev, pendingAttachment]);
        }
      }

      // Refetch to load real rows (with real DB ids + paths)
      if (journalEntryId) {
        await queryClient.invalidateQueries({
          queryKey: ['journal-entry-attachments', journalEntryId],
        });
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });
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
      if (attachmentId.startsWith('pending-')) {
        // Delete pending attachment
        const attachment = pendingAttachments.find(a => a.id === attachmentId);
        if (!attachment) throw new Error('Pending attachment not found');

        // Best-effort storage cleanup. Do not block removing the pending icon.
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([attachment.file_path]);

        if (storageError) {
          console.warn('Pending attachment storage cleanup failed, removing from UI anyway:', storageError);
        }

        // Remove from pending list
        setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));

        toast({
          title: "Success",
          description: "File deleted successfully",
        });
      } else {
        // Delete persisted attachment row first; storage cleanup must never block the UI delete.
        const { data: attachment, error: lookupError } = await supabase
          .from('journal_entry_attachments')
          .select('file_path')
          .eq('id', attachmentId)
          .maybeSingle();

        if (lookupError) {
          console.warn('Attachment lookup failed, continuing with DB delete:', lookupError);
        }

        // Delete from database (no-op if row already gone). This is the user-facing delete.
        const { error: dbError } = await supabase
          .from('journal_entry_attachments')
          .delete()
          .eq('id', attachmentId);

        if (dbError) throw dbError;

        queryClient.setQueryData<Attachment[]>(
          ['journal-entry-attachments', journalEntryId],
          (current = []) => current.filter(a => a.id !== attachmentId)
        );

        await queryClient.invalidateQueries({ queryKey: ['journal-entry-attachments', journalEntryId] });

        // Best-effort storage cleanup after the row is removed.
        if (attachment?.file_path) {
          const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([attachment.file_path]);

          if (storageError) {
            console.warn('Attachment storage cleanup failed after DB delete:', storageError);
          }
        }

        toast({
          title: "Success",
          description: "File deleted successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const finalizePendingAttachments = async (finalJournalEntryId: string) => {
    if (pendingAttachments.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();

    try {
      const inserts = pendingAttachments.map(att => ({
        journal_entry_id: finalJournalEntryId,
        file_name: att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        content_type: att.content_type,
        uploaded_by: user?.id,
      }));

      const { error } = await supabase
        .from('journal_entry_attachments')
        .insert(inserts);

      if (error) throw error;

      // Clear pending attachments
      setPendingAttachments([]);

      queryClient.invalidateQueries({ queryKey: ['journal-entry-attachments', finalJournalEntryId] });
    } catch (error) {
      console.error('Error finalizing attachments:', error);
      toast({
        title: "Error",
        description: "Failed to link attachments to journal entry",
        variant: "destructive",
      });
    }
  };

  // Combine pending and persisted attachments
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
