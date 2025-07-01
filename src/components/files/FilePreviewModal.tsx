
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
      // Get a signed URL with longer expiry
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 7200); // 2 hours expiry

      if (error) throw error;

      // Open the file in a new tab
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive",
      });
    }
  };

  // Return null since we don't want to render any modal
  return null;
}
