import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload: () => void;
}

export function PDFViewer({ fileUrl, fileName, onDownload }: PDFViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">{fileName}</h3>
          <p className="text-muted-foreground mb-4">
            Unable to preview this PDF. Click download to view the file.
          </p>
          <Button onClick={onDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading PDF...</p>
          </div>
        </div>
      )}
      
      {/* Try iframe first, then object, then embed as fallbacks */}
      <iframe
        src={fileUrl}
        className="flex-1 w-full border-0"
        title={fileName}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{ minHeight: '600px' }}
      />
      
      {/* Fallback object tag */}
      <object
        data={fileUrl}
        type="application/pdf"
        className="flex-1 w-full"
        style={{ display: hasError ? 'none' : 'block', minHeight: '600px' }}
      >
        {/* Fallback embed tag */}
        <embed
          src={fileUrl}
          type="application/pdf"
          className="flex-1 w-full"
          style={{ minHeight: '600px' }}
        />
      </object>
    </div>
  );
}