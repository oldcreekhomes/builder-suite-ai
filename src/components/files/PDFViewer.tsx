import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload: () => void;
}

export function PDFViewer({ fileUrl, fileName, onDownload }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDocument = await loadingTask.promise;
        
        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        
        // Render first page
        await renderPage(pdfDocument, 1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF. Click download to view the file.');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [fileUrl]);

  const renderPage = async (pdfDocument: any, pageNumber: number) => {
    if (!canvasRef.current) return;

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  };

  useEffect(() => {
    if (pdf) {
      renderPage(pdf, pageNum);
    }
  }, [pdf, pageNum, scale, rotation]);

  const handlePrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const handleNextPage = () => {
    if (pageNum < totalPages) {
      setPageNum(pageNum + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">{fileName}</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
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
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={pageNum <= 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pageNum} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={pageNum >= totalPages}
          >
            Next
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
        <canvas
          ref={canvasRef}
          className="border shadow-lg bg-white"
          style={{ maxWidth: '100%', height: 'fit-content' }}
        />
      </div>
    </div>
  );
}