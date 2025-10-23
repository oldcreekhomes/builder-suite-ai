import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// Set up PDF.js worker using local import to avoid CDN blocking
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload: () => void;
  onZoomChange?: (zoom: number, canZoomIn: boolean, canZoomOut: boolean) => void;
  onPageCountChange?: (count: number, isLoading: boolean) => void;
}

export function PDFViewer({ fileUrl, fileName, onDownload, onZoomChange, onPageCountChange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [baseScale, setBaseScale] = useState<number | null>(null);
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]));
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pageRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const pageWidthSet = React.useRef(false);
  
  // Pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  
  const scale = (baseScale || 0.5) * zoomMultiplier;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setHasError(false);
    onPageCountChange?.(numPages, false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setHasError(true);
    setIsLoading(false);
  };

  // Dynamic scale calculation for fit-to-screen (entire page visible)
  React.useEffect(() => {
    if (!containerRef.current || !numPages || pageWidth === 0 || pageHeight === 0) return;
    
    const updateScale = () => {
      const containerWidth = containerRef.current?.offsetWidth || 800;
      const containerHeight = containerRef.current?.offsetHeight || 600;
      
      if (!containerWidth || !containerHeight) return;
      
      const horizontalPad = 16;
      const verticalPad = 16;
      const widthScale = (containerWidth - horizontalPad) / pageWidth;
      const heightScale = (containerHeight - verticalPad) / pageHeight;
      const newBase = Math.max(0.1, Math.min(Math.min(widthScale, heightScale), 5.0));
      
      // Only update if changed significantly (prevent micro-updates)
      setBaseScale(prev => prev === null || Math.abs(prev - newBase) > 0.01 ? newBase : prev);
    };
    
    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [numPages, pageWidth, pageHeight]);

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

    // Observe all page container divs
    const currentRefs = Array.from(pageRefs.current.values());
    currentRefs.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    
    return () => observer.disconnect();
  }, [numPages, visiblePages.size]);

  const zoomIn = () => {
    setZoomMultiplier(prev => Math.min(3.0, prev + 0.25));
  };

  const zoomOut = () => {
    setZoomMultiplier(prev => Math.max(0.5, prev - 0.25));
  };

  // Notify parent of zoom changes (report relative multiplier so initial shows 100%)
  React.useEffect(() => {
    if (baseScale === null) return;
    const currentZoom = zoomMultiplier;
    const canZoomIn = zoomMultiplier < 3.0;
    const canZoomOut = zoomMultiplier > 0.5;
    onZoomChange?.(currentZoom, canZoomIn, canZoomOut);
  }, [baseScale, zoomMultiplier, onZoomChange]);

  // Listen for zoom events from header
  React.useEffect(() => {
    const handleZoomInEvent = () => zoomIn();
    const handleZoomOutEvent = () => zoomOut();
    
    window.addEventListener('pdf-zoom-in', handleZoomInEvent);
    window.addEventListener('pdf-zoom-out', handleZoomOutEvent);
    
    return () => {
      window.removeEventListener('pdf-zoom-in', handleZoomInEvent);
      window.removeEventListener('pdf-zoom-out', handleZoomOutEvent);
    };
  }, [zoomMultiplier]);

  // Mouse wheel zoom
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow wheel zoom without modifier key for better UX
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        
        const delta = e.deltaY;
        if (delta < 0) {
          // Wheel up = zoom in
          setZoomMultiplier(prev => Math.min(prev + 0.25, 3.0));
        } else {
          // Wheel down = zoom out
          setZoomMultiplier(prev => Math.max(prev - 0.25, 0.5));
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current?.scrollLeft || 0,
      scrollTop: containerRef.current?.scrollTop || 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - deltaX;
    containerRef.current.scrollTop = dragStart.scrollTop - deltaY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      {/* PDF Viewer */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-muted/20 p-2 min-h-0" 
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        tabIndex={0} 
        role="region" 
        aria-label="PDF pages"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
                        if (pageNum === 1 && !pageWidthSet.current) {
                          const width = page.width;
                          const height = page.height;
                          setPageWidth(width);
                          setPageHeight(height);
                          
                          // Calculate initial scale to fit entire page on screen
                          const containerWidth = containerRef.current?.offsetWidth || 800;
                          const containerHeight = containerRef.current?.offsetHeight || 600;
                          const widthScale = (containerWidth - 16) / width;
                          const heightScale = (containerHeight - 16) / height;
                          const initialScale = Math.max(0.1, Math.min(Math.min(widthScale, heightScale), 5.0));
                          setBaseScale(initialScale);
                          
                          pageWidthSet.current = true;
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