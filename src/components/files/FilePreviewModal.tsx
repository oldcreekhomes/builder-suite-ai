
import { useEffect } from "react";
import { openProjectFile } from "@/utils/fileOpenUtils";

interface FilePreviewModalProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
  useEffect(() => {
    if (isOpen && file) {
      console.log('FILES FilePreviewModal: Opening file', file);
      openProjectFile(file.storage_path, file.name || file.storage_path.split('/').pop());
      onClose(); // Close the modal immediately
    }
  }, [isOpen, file, onClose]);

  // Return null since we don't want to render any modal
  return null;
}
