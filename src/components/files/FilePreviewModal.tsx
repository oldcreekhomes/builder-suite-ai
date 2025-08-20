
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FilePreviewModalProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && file) {
      openFileInNewTab();
      onClose(); // Close the modal immediately
    }
  }, [isOpen, file, onClose]);

  const openFileInNewTab = async () => {
    const { openInNewTabSafely } = await import('@/utils/fileOpenUtils');
    await openInNewTabSafely(async () => {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 7200); // 2 hours expiry

      if (error) throw error;
      return data.signedUrl;
    });
  };

  // Return null since we don't want to render any modal
  return null;
}
