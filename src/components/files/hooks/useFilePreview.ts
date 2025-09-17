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

        // For PDFs, download as blob to avoid Chrome blocking (detect by mime or extension)
        const isPdf = (f: typeof file) => {
          const name = (f.name || '').toLowerCase();
          const path = (f.path || '').toLowerCase();
          return f.mimeType === 'application/pdf' || name.endsWith('.pdf') || path.endsWith('.pdf');
        };

        if (isPdf(file)) {
          try {
            const { data: blobData, error: downloadError } = await supabase.storage
              .from(file.bucket)
              .download(file.path);

            if (!downloadError && blobData) {
              // Ensure the blob has the correct content type for PDF viewers
              const pdfBlob = blobData.type === 'application/pdf'
                ? blobData
                : new Blob([blobData], { type: 'application/pdf' });
              const blobUrl = URL.createObjectURL(pdfBlob);
              setFileUrl(blobUrl);
              setIsLoading(false);
              return;
            }
          } catch (blobError) {
            console.log('Blob download failed, trying signed URL');
          }
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

  // Cleanup blob URLs when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

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