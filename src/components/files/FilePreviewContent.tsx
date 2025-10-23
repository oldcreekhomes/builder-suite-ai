import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import { UniversalFile } from "./FilePreviewModal";
import { getFileType, FileType } from "./utils/fileTypeUtils";
import { PDFViewer } from "./PDFViewer";

interface FilePreviewContentProps {
  file: UniversalFile;
  fileUrl: string | null;
  isLoading: boolean;
  error: string | null;
  onDownload: () => void;
  onZoomChange?: (zoom: number, canZoomIn: boolean, canZoomOut: boolean) => void;
  onPageCountChange?: (count: number, isLoading: boolean) => void;
}

export function FilePreviewContent({ 
  file, 
  fileUrl, 
  isLoading, 
  error,
  onDownload,
  onZoomChange,
  onPageCountChange
}: FilePreviewContentProps) {
  const [imageZoom, setImageZoom] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  
  const fileType = getFileType(file.name, file.mimeType);

  const zoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  const resetZoom = () => setImageZoom(1);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">Preview not available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error || "Unable to load file preview. Download the file to view it."}
          </p>
          <Button onClick={onDownload} variant="default" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  // Image preview with zoom
  if (fileType === FileType.IMAGE) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Image zoom controls */}
        <div className="flex items-center justify-center gap-2 p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={imageZoom <= 0.25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
            {Math.round(imageZoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={imageZoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {imageZoom !== 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="text-xs"
            >
              Reset
            </Button>
          )}
        </div>
        
        {/* Image display */}
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/50 overflow-hidden">
          <img
            src={fileUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ 
              transform: `scale(${imageZoom})`,
              cursor: imageZoom > 1 ? 'move' : 'default'
            }}
            onError={() => {
              console.error('Image failed to load:', fileUrl);
            }}
          />
        </div>
      </div>
    );
  }

  // PDF preview with PDF.js
  if (fileType === FileType.PDF) {
    return (
      <PDFViewer
        fileUrl={fileUrl}
        fileName={file.name}
          onDownload={onDownload}
          onZoomChange={onZoomChange}
          onPageCountChange={onPageCountChange}
        />
    );
  }

  // Text/Code preview
  if (fileType === FileType.TEXT) {
    return (
      <div className="flex-1 overflow-hidden">
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={file.name}
        />
      </div>
    );
  }

  // Fallback for unsupported file types
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium text-foreground mb-2">Preview not supported</h3>
        <p className="text-sm text-muted-foreground mb-2">
          File type: {file.mimeType || 'Unknown'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          This file type can't be previewed here. Download the file to view it.
        </p>
        <Button onClick={onDownload} variant="default" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
}