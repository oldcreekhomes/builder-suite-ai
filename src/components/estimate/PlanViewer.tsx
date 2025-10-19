import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Canvas as FabricCanvas, Circle, Line, Rect, Polygon, Text, Group } from "fabric";
import { DrawingToolbar } from "./DrawingToolbar";
import { ScaleCalibrationDialog } from "./ScaleCalibrationDialog";
import { DOMOverlays } from "./DOMOverlays";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useToast } from "@/hooks/use-toast";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PlanViewerProps {
  sheetId: string | null;
  takeoffId: string;
  selectedTakeoffItem: { id: string; color: string; category: string } | null;
  visibleAnnotations: Set<string>;
  onToggleVisibility: (itemId: string) => void;
}

type DrawingTool = 'select' | 'count' | 'line' | 'rectangle' | 'polygon';

// Helper function to choose contrasting text color
function chooseBlackOrWhite(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function PlanViewer({ sheetId, takeoffId, selectedTakeoffItem, visibleAnnotations, onToggleVisibility }: PlanViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasReady, setCanvasReady] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [overlayMode, setOverlayMode] = useState<'fabric' | 'dom'>('dom');
  const [forceShow, setForceShow] = useState<boolean>(true);
  const [addProbes, setAddProbes] = useState<boolean>(true);
  const [testOverlay, setTestOverlay] = useState<boolean>(false);
  const annotationObjectsRef = useRef<Map<string, any>>(new Map());
  
  const { toast } = useToast();
  const { annotations, saveAnnotation, deleteAnnotation, isSaving } = useAnnotations(sheetId);

  // Reset canvas ready state when sheet changes
  useEffect(() => {
    setCanvasReady(false);
    setImgNaturalSize(null);
  }, [sheetId]);

  const { data: sheet } = useQuery({
    queryKey: ['takeoff-sheet', sheetId],
    queryFn: async () => {
      if (!sheetId) return null;
      
      const { data, error } = await supabase
        .from('takeoff_sheets')
        .select('*')
        .eq('id', sheetId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!sheetId,
  });

  const { data: fileUrl } = useQuery({
    queryKey: ['sheet-file-url', sheet?.file_path],
    queryFn: async () => {
      if (!sheet?.file_path) return null;
      
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(sheet.file_path);

      return data.publicUrl;
    },
    enabled: !!sheet?.file_path,
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: pageWidth,
      height: 1000,
      backgroundColor: 'transparent',
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [pageWidth]);

  // Note: Zoom and pan are handled by CSS transform on the wrapper div
  // to keep PDF and canvas overlay synchronized

  // Load and display annotations
  useEffect(() => {
    if (!fabricCanvas || !annotations || !sheetId || !canvasReady || overlayMode !== 'fabric') return;

    // Clear existing annotation objects
    annotationObjectsRef.current.forEach(obj => fabricCanvas.remove(obj));
    annotationObjectsRef.current.clear();

    const canvasW = fabricCanvas.getWidth();
    const canvasH = fabricCanvas.getHeight();

    // Compute per-page vertical offset for PDFs
    const isPDF = sheet?.file_name?.toLowerCase().endsWith(".pdf");
    const pageNum = sheet?.page_number || 1;
    const originalPageH = imgNaturalSize?.height ?? null;
    const pageOffsetY = isPDF && originalPageH ? (pageNum - 1) * originalPageH : 0;

    // Helper to normalize Y coordinates (subtract page offset for multi-page PDFs)
    const tol = originalPageH ? Math.max(2, originalPageH * 0.005) : 2;
    const fixY = (y: number) => {
      if (!isPDF || !originalPageH || pageNum <= 1) return y;
      if (y >= pageOffsetY - tol) return y - pageOffsetY;
      return y;
    };

    // COMPUTE DISPLAY SCALE from PDF's original dimensions
    const originalW = imgNaturalSize?.width ?? null;
    const originalH = imgNaturalSize?.height ?? null;
    const displayScaleX = originalW ? canvasW / originalW : 1;
    const displayScaleY = originalH ? canvasH / originalH : 1;

    // PRE-SCAN: Find the actual coordinate space of AI annotations
    let globalMaxX = 0;
    let globalMaxY = 0;
    let outOfBoundsCount = 0;

    annotations.forEach(annotation => {
      try {
        const shape = typeof annotation.geometry === 'string' 
          ? JSON.parse(annotation.geometry as string) 
          : annotation.geometry;
        
        let maxX = 0;
        let maxY = 0;

        switch (annotation.annotation_type) {
          case 'rectangle':
            const top = fixY(shape.top);
            maxX = shape.left + (shape.width || 0);
            maxY = top + (shape.height || 0);
            break;
          case 'circle':
            const circleTop = fixY(shape.top);
            maxX = shape.left + (shape.radius || 0) * 2;
            maxY = circleTop + (shape.radius || 0) * 2;
            break;
          case 'line':
            maxX = Math.max(shape.x1 || 0, shape.x2 || 0);
            maxY = Math.max(fixY(shape.y1 || 0), fixY(shape.y2 || 0));
            break;
          case 'polygon':
            if (shape.points && Array.isArray(shape.points)) {
              maxX = Math.max(...shape.points.map((p: any) => p.x || 0));
              maxY = Math.max(...shape.points.map((p: any) => fixY(p.y || 0)));
            }
            break;
        }

        // Track max coordinates to determine coordinate space
        if (maxX > 0 || maxY > 0) {
          globalMaxX = Math.max(globalMaxX, maxX);
          globalMaxY = Math.max(globalMaxY, maxY);
          if (maxX > canvasW * 1.1 || maxY > canvasH * 1.1) {
            outOfBoundsCount++;
          }
        }
      } catch (error) {
        console.error('Error scanning annotation:', error);
      }
    });

    // DECIDE SCALING MODE
    // For images: always use display scale based on natural -> displayed size
    // For PDFs: prefer display scale when annotation maxima align with original dims; otherwise fallback to maxima-based
    let scaleX = 1;
    let scaleY = 1;
    let useDisplayScale = false;

    if (!isPDF && originalW && originalH) {
      useDisplayScale = true;
      scaleX = Math.max(0.01, displayScaleX);
      scaleY = Math.max(0.01, displayScaleY);
      console.debug(`Using IMAGE display scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)} (original=${originalW}x${originalH}, displayed=${canvasW}x${canvasH})`);
    } else if (originalW && originalH && globalMaxX > 0 && globalMaxY > 0) {
      const tolerance = 1.2;
      if (globalMaxX <= originalW * tolerance && globalMaxY <= originalH * tolerance) {
        useDisplayScale = true;
        scaleX = Math.max(0.01, displayScaleX);
        scaleY = Math.max(0.01, displayScaleY);
        console.debug(`Using PDF display scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)} (original=${originalW}x${originalH}, displayed=${canvasW}x${canvasH})`);
      }
    }

    if (!useDisplayScale && outOfBoundsCount > 0) {
      // Fallback: fit to canvas based on global maxima
      scaleX = globalMaxX > canvasW ? canvasW / globalMaxX : 1;
      scaleY = globalMaxY > canvasH ? canvasH / globalMaxY : 1;
      scaleX = Math.min(1, Math.max(0.01, scaleX));
      scaleY = Math.min(1, Math.max(0.01, scaleY));
      console.debug(`Using maxima-based scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)} (globalMax=${globalMaxX.toFixed(1)}x${globalMaxY.toFixed(1)}, canvas=${canvasW}x${canvasH})`);
    }

    console.debug(`Scaling mode: ${useDisplayScale ? 'displayScale' : 'maximaScale'}, outOfBounds=${outOfBoundsCount}/${annotations.length}`);

    // Debug flags from state
    // forceShow: show all overlays regardless of filters
    // addProbes: draw small red squares for alignment

    let scaledCount = 0;
    const coordDebug: number[] = [];
    // Load annotations from database
    annotations.forEach(annotation => {
      try {
        const shape = typeof annotation.geometry === 'string' 
          ? JSON.parse(annotation.geometry as string) 
          : annotation.geometry;
        
        // Check visibility: if no filters, show all; otherwise check if item is in the set
        const isVisible = forceShow || visibleAnnotations.size === 0 || visibleAnnotations.has(annotation.takeoff_item_id || '');
        let fabricObject;

        switch (annotation.annotation_type) {
          case 'circle':
            const circleShape = shape as any;
            const circleTopFixed = fixY(circleShape.top);
            
            scaledCount++;
            
            const circleScaled = {
              left: circleShape.left * scaleX,
              top: circleTopFixed * scaleY,
              radius: circleShape.radius * ((scaleX + scaleY) / 2),
              strokeWidth: Math.max(2, (circleShape.strokeWidth || 2) * ((scaleX + scaleY) / 2)),
            };

            coordDebug.push(circleScaled.left, circleScaled.top);

            const circle = new Circle({
              ...circleScaled,
              stroke: annotation.color,
              fill: annotation.color,
              opacity: isVisible ? 0.6 : 0,
              selectable: true,
              evented: true,
            });
            
            // Add label if present
            if (annotation.label && isVisible) {
              const labelText = new Text(annotation.label, {
                left: circleScaled.left + 4,
                top: circleScaled.top + 4,
                fontSize: 12,
                fill: chooseBlackOrWhite(annotation.color),
                fontFamily: 'Inter, sans-serif',
                selectable: false,
                evented: false,
              });
              
              const labelBg = new Rect({
                left: circleScaled.left + 2,
                top: circleScaled.top + 2,
                width: labelText.width! + 8,
                height: labelText.height! + 4,
                fill: annotation.color,
                opacity: 0.85,
                rx: 3,
                ry: 3,
                selectable: false,
                evented: false,
              });
              
              fabricObject = new Group([circle, labelBg, labelText], {
                selectable: true,
                evented: true,
              });
            } else {
              fabricObject = circle;
            }
            break;
            
          case 'rectangle':
            const base = shape as any;
            const baseTopFixed = fixY(base.top);
            
            scaledCount++;

            const scaled = {
              left: base.left * scaleX,
              top: baseTopFixed * scaleY,
              width: base.width * scaleX,
              height: base.height * scaleY,
              strokeWidth: Math.max(2, (base.strokeWidth || 2) * ((scaleX + scaleY) / 2)),
            };

            coordDebug.push(scaled.left, scaled.top);

            const rect = new Rect({
              ...scaled,
              stroke: annotation.color,
              fill: hexToRgba(annotation.color, 0.2),
              strokeWidth: scaled.strokeWidth || 2,
              opacity: isVisible ? 1 : 0,
              selectable: true,
              evented: true,
            });
            
            // Add label if present
            if (annotation.label && isVisible) {
              const labelText = new Text(annotation.label, {
                left: scaled.left + 4,
                top: scaled.top + 4,
                fontSize: 12,
                fill: chooseBlackOrWhite(annotation.color),
                fontFamily: 'Inter, sans-serif',
                selectable: false,
                evented: false,
              });
              
              const labelBg = new Rect({
                left: scaled.left + 2,
                top: scaled.top + 2,
                width: labelText.width! + 8,
                height: labelText.height! + 4,
                fill: annotation.color,
                opacity: 0.85,
                rx: 3,
                ry: 3,
                selectable: false,
                evented: false,
              });
              
              fabricObject = new Group([rect, labelBg, labelText], {
                selectable: true,
                evented: true,
              });
            } else {
              fabricObject = rect;
            }
            break;
            
          case 'line':
            const lineShape = shape as any;
            const lineY1Fixed = fixY(lineShape.y1);
            const lineY2Fixed = fixY(lineShape.y2);
            
            scaledCount++;
            
            const lineScaled = {
              x1: lineShape.x1 * scaleX,
              y1: lineY1Fixed * scaleY,
              x2: lineShape.x2 * scaleX,
              y2: lineY2Fixed * scaleY,
              strokeWidth: Math.max(2, (lineShape.strokeWidth || 2) * ((scaleX + scaleY) / 2)),
            };

            coordDebug.push(lineScaled.x1, lineScaled.y1, lineScaled.x2, lineScaled.y2);
            
            fabricObject = new Line([lineScaled.x1, lineScaled.y1, lineScaled.x2, lineScaled.y2], {
              stroke: annotation.color,
              strokeWidth: lineScaled.strokeWidth || 2,
              opacity: isVisible ? 1 : 0,
              selectable: true,
              evented: true,
            });
            break;
            
          case 'polygon':
            const polygonShape = shape as any;
            const polygonPointsFixed = polygonShape.points.map((p: any) => ({
              x: p.x,
              y: fixY(p.y),
            }));
            
            scaledCount++;
            
            const polygonPointsScaled = polygonPointsFixed.map((p: any) => ({
              x: p.x * scaleX,
              y: p.y * scaleY,
            }));

            polygonPointsScaled.forEach((p: any) => coordDebug.push(p.x, p.y));

            const polygon = new Polygon(polygonPointsScaled, {
              stroke: annotation.color,
              fill: 'transparent',
              strokeWidth: Math.max(2, (polygonShape.strokeWidth || 2) * ((scaleX + scaleY) / 2)),
              opacity: isVisible ? 0.6 : 0,
              selectable: true,
              evented: true,
            });
            
            // Add label if present - use first point for positioning
            if (annotation.label && isVisible && polygonPointsScaled.length > 0) {
              const firstPoint = polygonPointsScaled[0];
              const labelText = new Text(annotation.label, {
                left: firstPoint.x + 4,
                top: firstPoint.y + 4,
                fontSize: 12,
                fill: chooseBlackOrWhite(annotation.color),
                fontFamily: 'Inter, sans-serif',
                selectable: false,
                evented: false,
              });
              
              const labelBg = new Rect({
                left: firstPoint.x + 2,
                top: firstPoint.y + 2,
                width: labelText.width! + 8,
                height: labelText.height! + 4,
                fill: annotation.color,
                opacity: 0.85,
                rx: 3,
                ry: 3,
                selectable: false,
                evented: false,
              });
              
              fabricObject = new Group([polygon, labelBg, labelText], {
                selectable: true,
                evented: true,
              });
            } else {
              fabricObject = polygon;
            }
            break;
        }

        if (fabricObject) {
          fabricCanvas.add(fabricObject);
          annotationObjectsRef.current.set(annotation.id, fabricObject);

          if (addProbes && (fabricObject as any).getBoundingRect) {
            try {
              const br = (fabricObject as any).getBoundingRect();
              if (br && isFinite(br.left) && isFinite(br.top)) {
                const probe = new Rect({
                  left: br.left - 4,
                  top: br.top - 4,
                  width: 8,
                  height: 8,
                  fill: 'hsl(0 90% 50%)',
                  opacity: 0.9,
                  selectable: false,
                  evented: false,
                });
                fabricCanvas.add(probe);
              }
            } catch (e) {
              console.debug('Probe add error:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error loading annotation:', error);
      }
    });

    // Debug logging
    if (coordDebug.length > 0) {
      console.debug(`Rendered ${annotations.length} annotations (${scaledCount} scaled). Coords: min=${Math.min(...coordDebug).toFixed(1)}, max=${Math.max(...coordDebug).toFixed(1)}`);
    }

    fabricCanvas.renderAll();
  }, [annotations, fabricCanvas, visibleAnnotations, sheetId, canvasReady, imgNaturalSize]);

  const handleToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = tool === 'select';

    // Allow drawing when a takeoff item is selected
    if (selectedTakeoffItem && tool === 'count') {
      fabricCanvas.off('mouse:down');
      fabricCanvas.on('mouse:down', (e) => {
        if (!e.pointer || !sheetId) return;
        
        const circle = new Circle({
          left: e.pointer.x,
          top: e.pointer.y,
          radius: 15,
          fill: selectedTakeoffItem.color,
          stroke: selectedTakeoffItem.color,
          strokeWidth: 2,
          opacity: 0.6,
        });
        
        fabricCanvas.add(circle);
        
        // Save to database
        saveAnnotation({
          takeoff_item_id: selectedTakeoffItem.id,
          takeoff_sheet_id: sheetId,
          annotation_type: 'circle',
          geometry: circle.toJSON(),
          color: selectedTakeoffItem.color,
        });
      });
    } else {
      fabricCanvas.off('mouse:down');
      if (tool !== 'select' && !selectedTakeoffItem) {
        toast({
          title: "Select an item first",
          description: "Select a takeoff item from the table to annotate",
        });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.25), 3));
  };

  // Attach native wheel listener with passive:false to avoid console warnings
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.25), 3));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || activeTool !== 'select') return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  if (!sheetId) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10">
        <p className="text-muted-foreground">Select a sheet to begin</p>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isPDF = sheet?.file_name.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <div className="flex items-center gap-4 px-4 py-2 border-b">
        <DrawingToolbar 
          activeTool={activeTool}
          onToolClick={handleToolClick}
          onCalibrateScale={() => setShowScaleDialog(true)}
          scaleRatio={sheet?.scale_ratio}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          overlayMode={overlayMode}
          onOverlayModeChange={setOverlayMode}
          forceShow={forceShow}
          onForceShowChange={setForceShow}
          addProbes={addProbes}
          onAddProbesChange={setAddProbes}
          testOverlay={testOverlay}
          onTestOverlayChange={setTestOverlay}
        />
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : (zoom > 1 && activeTool === 'select' ? 'grab' : 'default'), overscrollBehavior: 'contain', touchAction: 'none' }}
      >
        <div 
          className="relative inline-block"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'top left',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {isPDF ? (
            <Document
              key={fileUrl || 'doc'}
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page 
                key={`${sheet?.page_number || 1}-${pageWidth}`}
                pageNumber={sheet?.page_number || 1}
                width={pageWidth}
                onLoadSuccess={(page) => {
                  setPageWidth(page.width);
                  
                  // Get original PDF page dimensions (at scale 1)
                  const viewport = page.originalWidth && page.originalHeight
                    ? { width: page.originalWidth, height: page.originalHeight }
                    : page.view 
                      ? { width: page.view[2] - page.view[0], height: page.view[3] - page.view[1] }
                      : null;
                  
                  if (viewport) {
                    setImgNaturalSize({
                      width: viewport.width,
                      height: viewport.height,
                    });
                    
                    const scaleX = page.width / viewport.width;
                    const scaleY = page.height / viewport.height;
                    console.debug(`PDF: displayed=${page.width}x${page.height}, original=${viewport.width}x${viewport.height}, scale=${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
                  }
                  
                  if (fabricCanvas) {
                    fabricCanvas.setDimensions({
                      width: page.width,
                      height: page.height,
                    });
                    setCanvasReady(true);
                  }
                }}
              />
            </Document>
          ) : (
            <img 
              src={fileUrl} 
              alt="Drawing sheet" 
              className="max-w-full"
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                if (fabricCanvas) {
                  fabricCanvas.setDimensions({
                    width: img.width,
                    height: img.height,
                  });
                  setImgNaturalSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                  const sx = img.width / img.naturalWidth;
                  const sy = img.height / img.naturalHeight;
                  console.debug(`IMAGE: displayed=${img.width}x${img.height}, natural=${img.naturalWidth}x${img.naturalHeight}, scale=${sx.toFixed(2)}x${sy.toFixed(2)}`);
                  setCanvasReady(true);
                }
              }}
            />
          )}
          
          {/* Keep both mounted to avoid DOM thrashing errors; toggle visibility */}
          {/* Debug HUD */}
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-background/80 text-xs shadow" style={{ zIndex: 600, pointerEvents: 'none' }}>
            Mode: {overlayMode} • Zoom: {Math.round(zoom * 100)}% • Canvas: {fabricCanvas ? `${fabricCanvas.getWidth()}x${fabricCanvas.getHeight()}` : '0x0'} • Natural: {imgNaturalSize ? `${imgNaturalSize.width}x${imgNaturalSize.height}` : 'n/a'}
          </div>
          {/* Empty state banner */}
          {annotations && annotations.length === 0 && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded bg-muted text-foreground text-xs shadow" style={{ zIndex: 600, pointerEvents: 'none' }}>
              No overlays found for this sheet
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ display: overlayMode === 'fabric' ? 'block' : 'none', zIndex: 200, width: '100%', height: '100%' }}
          />

          <div style={{ display: overlayMode === 'dom' ? 'block' : 'none' }}>
            {canvasReady && imgNaturalSize && (
              <DOMOverlays
                annotations={annotations || []}
                visibleAnnotations={visibleAnnotations}
                sheet={sheet}
                canvasSize={
                  fabricCanvas
                    ? { width: fabricCanvas.getWidth(), height: fabricCanvas.getHeight() }
                    : { width: pageWidth, height: imgNaturalSize ? Math.round(pageWidth * (imgNaturalSize.height / imgNaturalSize.width)) : 600 }
                }
                imgNaturalSize={imgNaturalSize}
                forceShow={forceShow}
                addProbes={addProbes}
                testOverlay={testOverlay}
              />
            )}
          </div>
        </div>
      </div>

      <ScaleCalibrationDialog
        open={showScaleDialog}
        onOpenChange={setShowScaleDialog}
        sheetId={sheetId}
        fabricCanvas={fabricCanvas}
      />
    </div>
  );
}
