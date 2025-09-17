import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FilePreviewHeader } from "./FilePreviewHeader";
import { FilePreviewContent } from "./FilePreviewContent";
import { useFilePreview } from "./hooks/useFilePreview";

export interface UniversalFile {
  id?: string;
  name: string;
  size?: number;
  mimeType?: string;
  bucket: string;
  path: string;
  url?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  description?: string;
}

interface FilePreviewModalProps {
  file: UniversalFile | null;
  isOpen: boolean;
  onClose: () => void;
  onFileDeleted?: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose, onFileDeleted }: FilePreviewModalProps) {
  const { 
    isLoading, 
    error, 
    fileUrl,
    handleDownload, 
    handleDelete, 
    isDeleting 
  } = useFilePreview({
    file,
    isOpen,
    onFileDeleted,
    onClose
  });

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] p-0 flex flex-col border-0">
        <DialogTitle className="sr-only">
          {file.description || file.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          File preview for {file.name}
        </DialogDescription>
        
        <div className="relative w-full h-full flex flex-col bg-background rounded-lg overflow-hidden">
          <FilePreviewHeader
            file={file}
            isDeleting={isDeleting}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onClose={onClose}
            showDelete={!!onFileDeleted}
          />

          <FilePreviewContent 
            file={file}
            fileUrl={fileUrl}
            isLoading={isLoading}
            error={error}
            onDownload={handleDownload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}