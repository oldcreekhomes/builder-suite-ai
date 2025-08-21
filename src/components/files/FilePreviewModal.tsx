
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
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 7200); // 2 hours expiry

      if (error) throw error;
      
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  // Return null since we don't want to render any modal
  return null;
}
