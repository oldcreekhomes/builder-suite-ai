import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UniversalFile } from "../FilePreviewModal";

interface UseFilePreviewProps {
  file: UniversalFile | null;
  isOpen: boolean;
  onFileDeleted?: () => void;
  onClose: () => void;
}

export function useFilePreview({ file, isOpen, onFileDeleted, onClose }: UseFilePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load file URL when modal opens or file changes
  useEffect(() => {
    if (!isOpen || !file) {
      setFileUrl(null);
      setError(null);
      return;
    }

    const loadFileUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // If file already has a URL, use it
        if (file.url) {
          setFileUrl(file.url);
          setIsLoading(false);
          return;
        }

        // Try to get signed URL first (for private files)
        try {
          const { data: signedData, error: signedError } = await supabase.storage
            .from(file.bucket)
            .createSignedUrl(file.path, 3600); // 1 hour expiry

          if (!signedError && signedData?.signedUrl) {
            setFileUrl(signedData.signedUrl);
            setIsLoading(false);
            return;
          }
        } catch (signedError) {
          console.log('Signed URL failed, trying public URL');
        }

        // Fallback to public URL (for public buckets)
        const { data: publicData } = supabase.storage
          .from(file.bucket)
          .getPublicUrl(file.path);

        if (publicData?.publicUrl) {
          setFileUrl(publicData.publicUrl);
        } else {
          setError("Unable to load file URL");
        }
      } catch (err) {
        console.error('Error loading file URL:', err);
        setError("Failed to load file preview");
      } finally {
        setIsLoading(false);
      }
    };

    loadFileUrl();
  }, [file, isOpen]);

  const handleDownload = async () => {
    if (!file) return;

    try {
      // Try to download from storage
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .download(file.path);

      if (error) {
        // Fallback to using the file URL for download
        if (fileUrl) {
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = file.name;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('Download started');
          return;
        }
        throw error;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Download started');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async () => {
    if (!file || !file.id) return;

    setIsDeleting(true);
    try {
      // For project files, mark as deleted in database
      if (file.bucket === 'project-files') {
        const { error } = await supabase
          .from('project_files')
          .update({ is_deleted: true })
          .eq('id', file.id);

        if (error) throw error;
      } else {
        // For other buckets, delete from storage directly
        const { error } = await supabase.storage
          .from(file.bucket)
          .remove([file.path]);

        if (error) throw error;
      }

      toast.success('File deleted successfully');
      onClose();
      onFileDeleted?.();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isLoading,
    error,
    fileUrl,
    isDeleting,
    handleDownload,
    handleDelete
  };
}