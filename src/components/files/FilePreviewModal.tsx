import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FilePreviewHeader } from "./FilePreviewHeader";
import { FilePreviewContent } from "./FilePreviewContent";
import { useFilePreview } from "./hooks/useFilePreview";
import { getFileType, FileType } from "./utils/fileTypeUtils";

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

  // PDF-specific state
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [pdfIsLoading, setPdfIsLoading] = useState(true);
  const [pdfZoom, setPdfZoom] = useState<number>(1);
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [isPanEnabled, setIsPanEnabled] = useState(false);

  const handleZoomChange = useCallback((zoom: number, canZoomInVal: boolean, canZoomOutVal: boolean) => {
    setPdfZoom(zoom);
    setCanZoomIn(canZoomInVal);
    setCanZoomOut(canZoomOutVal);
  }, []);

  const handlePageCountChange = useCallback((count: number, isLoadingPages: boolean) => {
    setPdfPageCount(count);
    setPdfIsLoading(isLoadingPages);
  }, []);

  const handleTogglePan = useCallback(() => {
    setIsPanEnabled(prev => {
      const newValue = !prev;
      window.dispatchEvent(new CustomEvent('pdf-toggle-pan', { detail: { enabled: newValue } }));
      return newValue;
    });
  }, []);

  if (!file) return null;

  const fileType = getFileType(file.name, file.mimeType);
  const isPDF = fileType === FileType.PDF;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full max-h-[95vh] p-0 flex flex-col border-0">
        <DialogTitle className="sr-only">
          {file.description || file.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          File preview for {file.name}
        </DialogDescription>
        
        <div className="relative w-full flex flex-col bg-background rounded-lg overflow-hidden h-[calc(95vh-2rem)] min-h-0">
          <FilePreviewHeader
            file={file}
            isDeleting={isDeleting}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onClose={onClose}
            showDelete={!!onFileDeleted}
            isPDF={isPDF}
            pageCount={pdfPageCount}
            isLoadingPages={pdfIsLoading}
            zoom={pdfZoom}
            onZoomIn={() => {
              // Trigger zoom in via PDFViewer's internal handler
              const zoomInEvent = new CustomEvent('pdf-zoom-in');
              window.dispatchEvent(zoomInEvent);
            }}
            onZoomOut={() => {
              // Trigger zoom out via PDFViewer's internal handler
              const zoomOutEvent = new CustomEvent('pdf-zoom-out');
              window.dispatchEvent(zoomOutEvent);
            }}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            isPanEnabled={isPanEnabled}
            onTogglePan={handleTogglePan}
          />

          <FilePreviewContent 
            file={file}
            fileUrl={fileUrl}
            isLoading={isLoading}
            error={error}
            onDownload={handleDownload}
            onZoomChange={handleZoomChange}
            onPageCountChange={handlePageCountChange}
            isPanEnabled={isPanEnabled}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}