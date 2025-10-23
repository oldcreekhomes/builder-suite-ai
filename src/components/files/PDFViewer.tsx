import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Set up PDF.js worker using local import to avoid CDN blocking
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload: () => void;
}

export function PDFViewer({ fileUrl, fileName, onDownload }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [baseScale, setBaseScale] = useState<number>(1.0);
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]));
  const [pageWidth, setPageWidth] = useState<number>(612); // Standard PDF page width in points
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pageRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  
  const scale = baseScale * zoomMultiplier;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setHasError(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setHasError(true);
    setIsLoading(false);
  };

  // Dynamic width calculation
  React.useEffect(() => {
    if (!containerRef.current || !numPages) return;
    
    const updateScale = () => {
      const containerWidth = containerRef.current?.offsetWidth || 800;
      // Calculate scale to fit container width with padding
      const optimalScale = (containerWidth - 32) / pageWidth;
      setBaseScale(Math.min(optimalScale, 2.0)); // Cap at 200% for base scale
    };
    
    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [numPages, pageWidth]);

  // Virtual scrolling with Intersection Observer
  React.useEffect(() => {
    if (!numPages) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
            if (pageNum > 0) {
              setVisiblePages(prev => {
                const newSet = new Set(prev);
                // Load current page plus buffer pages (±2)
                for (let i = Math.max(1, pageNum - 2); i <= Math.min(numPages, pageNum + 2); i++) {
                  newSet.add(i);
                }
                return newSet;
              });
            }
          }
        });
      },
      { rootMargin: '500px' } // Start loading 500px before visible
    );

    // Observe all placeholder divs
    pageRefs.current.forEach(ref => observer.observe(ref));
    
    return () => observer.disconnect();
  }, [numPages]);

  const zoomIn = () => {
    setZoomMultiplier(prev => Math.min(3.0, prev + 0.25));
  };

  const zoomOut = () => {
    setZoomMultiplier(prev => Math.max(0.5, prev - 0.25));
  };

  const resetZoom = () => {
    setZoomMultiplier(1.0);
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isLoading ? 'Loading...' : `${numPages} ${numPages === 1 ? 'page' : 'pages'}`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoomMultiplier <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[50px] text-center">
            {Math.round(zoomMultiplier * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoomMultiplier >= 3.0}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-muted/20 p-2 min-h-0" 
        tabIndex={0} 
        role="region" 
        aria-label="PDF pages"
      >
        <div className="flex flex-col items-center gap-2 w-full mx-auto">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            }
          >
            {Array.from(new Array(numPages), (_, index) => {
              const pageNum = index + 1;
              const isVisible = visiblePages.has(pageNum);
              
              return (
                <div 
                  key={`page_${pageNum}`}
                  data-page={pageNum}
                  ref={el => el && pageRefs.current.set(pageNum, el)}
                  className="mb-2"
                >
                  {isVisible ? (
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      className="shadow-lg border bg-white max-w-full"
                      onLoadSuccess={(page) => {
                        if (pageNum === 1) {
                          setPageWidth(page.width);
                        }
                      }}
                      loading={
                        <div className="flex items-center justify-center p-8 bg-white border shadow-lg">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      }
                    />
                  ) : (
                    <div className="h-[1100px] bg-muted/50 border shadow-lg flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">Loading page {pageNum}...</p>
                    </div>
                  )}
                </div>
              );
            })}
          </Document>
        </div>
      </div>
    </div>
  );
}