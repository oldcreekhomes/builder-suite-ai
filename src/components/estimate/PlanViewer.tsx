import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Canvas as FabricCanvas, Circle, Line, Rect, Polygon, Text, Group } from "fabric";
import { DrawingToolbar } from "./DrawingToolbar";
import { ScaleCalibrationDialog } from "./ScaleCalibrationDialog";
import { DOMOverlays } from "./DOMOverlays";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useToast } from "@/hooks/use-toast";
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker is configured globally in src/lib/pdfConfig.ts

interface PlanViewerProps {
  sheetId: string | null;
  takeoffId: string;
  selectedTakeoffItem: { id: string; color: string; category: string } | null;
  visibleAnnotations: Set<string>;
  onToggleVisibility: (itemId: string) => void;
  onShowAllAnnotations: () => void;
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

export function PlanViewer({ sheetId, takeoffId, selectedTakeoffItem, visibleAnnotations, onToggleVisibility, onShowAllAnnotations }: PlanViewerProps) {
  // Use mutable ref for canvas to avoid re-render conflicts with Fabric DOM manipulation
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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
  const [docSize, setDocSize] = useState<{ width: number; height: number } | null>(null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number } | null>(null);
  const annotationObjectsRef = useRef<Map<string, any>>(new Map());
  
  // Refs to read current values without causing effect re-registration
  const zoomRef = useRef(zoom);
  const activeToolRef = useRef(activeTool);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { annotations, saveAnnotation, deleteAnnotation, isSaving } = useAnnotations(sheetId);

  // Reset canvas ready state and viewport when sheet changes
  useEffect(() => {
    setCanvasReady(false);
    setImgNaturalSize(null);
    setDocSize(null);
    setDocLoaded(false);
    setDisplayedSize(null);
    // Reset zoom/pan/scroll on sheet change to prevent off-screen overlays
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
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

  // Initialize Fabric.js canvas when sheet changes AND displayedSize is available
  // This ensures Fabric initializes with correct dimensions after the PDF/image loads
  useEffect(() => {
    // Don't initialize until we have displayedSize (from PDF/image load)
    if (!sheetId || !displayedSize) {
      console.info('[Fabric Init] Waiting for sheetId and displayedSize', { sheetId, displayedSize });
      return;
    }

    // Clean up any existing Fabric instance first
    if (fabricCanvas) {
      console.info('[Fabric Init] Disposing previous instance before re-init');
      fabricCanvas.dispose();
      setFabricCanvas(null);
    }

    // Wait for DOM to be ready (canvas element created after key-based remount)
    const timerId = setTimeout(() => {
      const canvasElement = canvasElRef.current;
      if (!canvasElement) {
        console.info('[Fabric Init] Canvas element not available');
        return;
      }
      
      console.info('[Fabric Init] Initializing Fabric.js canvas with displayedSize:', displayedSize);
      const canvas = new FabricCanvas(canvasElement, {
        width: displayedSize.width,
        height: displayedSize.height,
        backgroundColor: 'transparent',
      });

      // Diagnostics: confirm presence of lower/upper layers after init
      const hasLower = !!((canvas as any).lowerCanvasEl || (canvas as any).lower?.el);
      const hasUpper = !!((canvas as any).upperCanvasEl || (canvas as any).upper?.el);
      console.info('[Fabric Init] Complete', { hasLower, hasUpper, width: displayedSize.width, height: displayedSize.height });

      setFabricCanvas(canvas);
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timerId);
    };
  }, [sheetId, displayedSize?.width, displayedSize?.height]);

  // Cleanup Fabric on unmount
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        console.info('[Fabric Init] Disposing on unmount');
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  // Style upper/lower canvas for proper z-index and event handling
  // RESILIENT: Re-apply whenever Fabric or displayedSize changes (Fabric may recreate DOM nodes)
  useEffect(() => {
    if (!fabricCanvas) return;

    const applyFabricLayerStyles = () => {
      const lower = (fabricCanvas as any).lowerCanvasEl || (fabricCanvas as any).lower?.el;
      const upper = (fabricCanvas as any).upperCanvasEl || (fabricCanvas as any).upper?.el;
      const wrapper =
        (fabricCanvas as any).wrapperEl ||
        (upper?.parentElement as HTMLElement | null) ||
        (lower?.parentElement as HTMLElement | null);

      if (!wrapper || !upper || !lower) {
        console.warn('Fabric canvas elements not found:', { wrapper: !!wrapper, upper: !!upper, lower: !!lower });
        return false;
      }

      // Style the wrapper (contains both canvases) - this is the critical element
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.zIndex = '1000';
      wrapper.style.pointerEvents = 'auto';

      // Lower canvas: rendering only, no events
      lower.style.position = 'absolute';
      lower.style.top = '0';
      lower.style.left = '0';
      lower.style.zIndex = '900';
      lower.style.pointerEvents = 'none';

      // Upper canvas: event handling layer - TOPMOST
      upper.style.position = 'absolute';
      upper.style.top = '0';
      upper.style.left = '0';
      upper.style.zIndex = '1001';
      upper.style.pointerEvents = 'auto';

      console.info('✅ Fabric layers styled:', {
        wrapperZ: wrapper.style.zIndex,
        upperZ: upper.style.zIndex,
        upperPointer: upper.style.pointerEvents,
        upperClass: upper.className
      });
      return true;
    };

    // Apply immediately
    applyFabricLayerStyles();

    // Re-apply after short delays to catch late DOM updates
    const t1 = setTimeout(applyFabricLayerStyles, 50);
    const t2 = setTimeout(applyFabricLayerStyles, 150);
    const t3 = setTimeout(applyFabricLayerStyles, 300);
    const t4 = setTimeout(applyFabricLayerStyles, 500);
    const t5 = setTimeout(applyFabricLayerStyles, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [fabricCanvas, displayedSize, canvasReady, sheetId]);

  // Global Fabric event listeners for diagnostics and click-to-select
  // These are PERSISTENT and must not be removed by tool switching
  // IMPORTANT: Only depend on fabricCanvas to avoid re-registration; read zoom/activeTool from refs
  useEffect(() => {
    if (!fabricCanvas) return;
    
    console.info('[Fabric Listeners] Attaching persistent diagnostic handlers');
    
    // Diagnostic logger with on-screen debug info
    const diagnosticMouseDown = (e: any) => {
      // Use getPointer for correct coordinates
      const p = fabricCanvas.getPointer(e.e, true);
      const target = e?.target;
      
      console.info('[Diag] mouse:down', {
        pointer: p ? `(${p.x?.toFixed?.(1)}, ${p.y?.toFixed?.(1)})` : 'none',
        target: target ? `${target.type} [${target.annotationId || 'no-id'}]` : 'none',
        zoom: zoomRef.current,
        activeTool: activeToolRef.current,
      });
      
      
      // CLICK-TO-SELECT: If user clicks on an object, auto-select it regardless of tool
      if (target && target.selectable !== false && target.evented !== false) {
        // Switch to select mode and activate the object
        setActiveTool('select');
        fabricCanvas.setActiveObject(target);
        fabricCanvas.requestRenderAll();
        console.info('[Diag] Auto-selected object:', target.annotationId || target.type);
      }
    };
    
    const diagnosticSelectionCreated = (e: any) => {
      const selected = e?.selected || [];
      console.info('[Diag] selection:created', selected.map((o: any) => o.annotationId || o.type));
    };
    
    const diagnosticSelectionCleared = () => {
      console.info('[Diag] selection:cleared');
    };
    
    // Store references so they can be identified during cleanup
    (fabricCanvas as any).__persistentMouseDown = diagnosticMouseDown;
    (fabricCanvas as any).__persistentSelCreated = diagnosticSelectionCreated;
    (fabricCanvas as any).__persistentSelCleared = diagnosticSelectionCleared;
    
    fabricCanvas.on('mouse:down', diagnosticMouseDown);
    fabricCanvas.on('selection:created', diagnosticSelectionCreated);
    fabricCanvas.on('selection:cleared', diagnosticSelectionCleared);
    
    return () => {
      console.info('[Fabric Listeners] Removing persistent diagnostic handlers');
      fabricCanvas.off('mouse:down', diagnosticMouseDown);
      fabricCanvas.off('selection:created', diagnosticSelectionCreated);
      fabricCanvas.off('selection:cleared', diagnosticSelectionCleared);
    };
  }, [fabricCanvas]);
  
  // DOM-level click diagnostic to confirm events reach the container
  // Re-attach when sheetId/fileUrl changes to handle async DOM availability
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      console.warn('[DOM Listener] containerRef.current is null, will retry when dependencies change');
      return;
    }
    
    console.info('[DOM Listener] Attaching mousedown listener to containerRef');
    
    const handleDOMClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName?.toLowerCase() || 'unknown';
      const fullClassName = typeof target.className === 'string' ? target.className : '';
      
      // Identify what kind of canvas we're clicking
      const isFabricUpper = fullClassName.includes('upper-canvas');
      const isFabricLower = fullClassName.includes('lower-canvas');
      const canvasType = isFabricUpper ? 'FABRIC-UPPER' : isFabricLower ? 'FABRIC-LOWER' : 'OTHER';
      
      const domTarget = `${tagName}.${fullClassName || 'no-class'} [${canvasType}]`;
      
      // Log first 3 elements in composedPath for debugging
      const path = e.composedPath().slice(0, 3).map((el: EventTarget) => {
        const elem = el as HTMLElement;
        return elem.tagName ? `${elem.tagName.toLowerCase()}.${elem.className?.split?.(' ')?.[0] || ''}` : 'unknown';
      });
      
      console.info('[DOM] mousedown on:', domTarget, { 
        x: e.clientX, 
        y: e.clientY,
        path: path.join(' > ')
      });
      
    };
    
    container.addEventListener('mousedown', handleDOMClick, true); // capture phase
    
    return () => {
      console.info('[DOM Listener] Removing mousedown listener from containerRef');
      container.removeEventListener('mousedown', handleDOMClick, true);
    };
  }, [sheetId, fileUrl]);

  // Sync canvas dimensions when document loads
  useEffect(() => {
    if (!fabricCanvas || !displayedSize) return;
    
    fabricCanvas.setDimensions({
      width: displayedSize.width,
      height: displayedSize.height,
    });

    // Also sync style dimensions for upper/lower canvases and wrapper
    const lower = (fabricCanvas as any).lowerCanvasEl || (fabricCanvas as any).lower?.el;
    const upper = (fabricCanvas as any).upperCanvasEl || (fabricCanvas as any).upper?.el;
    const wrapper =
      (fabricCanvas as any).wrapperEl ||
      (upper?.parentElement as HTMLElement | null) ||
      (lower?.parentElement as HTMLElement | null);
    
    if (lower && upper) {
      lower.style.width = `${displayedSize.width}px`;
      lower.style.height = `${displayedSize.height}px`;
      upper.style.width = `${displayedSize.width}px`;
      upper.style.height = `${displayedSize.height}px`;
    }

    if (wrapper) {
      wrapper.style.width = `${displayedSize.width}px`;
      wrapper.style.height = `${displayedSize.height}px`;
    }

    setCanvasReady(true);
    
    console.debug(`Canvas dimensions set: ${displayedSize.width}x${displayedSize.height}`);
  }, [fabricCanvas, displayedSize]);

  // Configure Fabric.js for better hit-testing - keep viewport as identity (CSS handles zoom)
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Keep viewport as identity - CSS transform handles zoom, no double compensation
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    // Make hit-testing more tolerant
    fabricCanvas.targetFindTolerance = 10;
    fabricCanvas.perPixelTargetFind = true;
    
    fabricCanvas.renderAll();
    
    console.debug(`Fabric configured: identity viewport, tolerant hit-testing, zoom=${zoom}`);
  }, [fabricCanvas, zoom]);

  // Handle scale selection from dropdown
  const handleScaleSelect = async (scale: string) => {
    if (scale === "Auto-Detect Scale" || scale === "Custom...") {
      setShowScaleDialog(true);
      return;
    }
    
    // Directly save common scale
    try {
      const { error } = await supabase
        .from('takeoff_sheets')
        .update({ 
          drawing_scale: scale,
        })
        .eq('id', sheetId);
        
      if (error) throw error;
      toast({ title: "Success", description: `Scale set to ${scale}` });
    } catch (error) {
      console.error('Error saving scale:', error);
      toast({ title: "Error", description: "Failed to save scale", variant: "destructive" });
    }
  };

  // Note: Zoom and pan are handled by CSS transform on the wrapper div
  // to keep PDF and canvas overlay synchronized

  // Load and display annotations (visibility handled separately for efficiency)
  useEffect(() => {
    if (!fabricCanvas || !annotations || !sheetId || !canvasReady) return;

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
        
        // Initial visibility - will be updated by separate effect
        const isVisible = true;
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

            const isManualAnnotation = annotation.label?.includes('Manual');
            const rect = new Rect({
              ...scaled,
              stroke: annotation.color,
              fill: hexToRgba(annotation.color, 0.2),
              strokeWidth: scaled.strokeWidth || 2,
              strokeDashArray: isManualAnnotation ? [5, 5] : undefined,
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
            
            const isManualLine = annotation.label?.includes('Manual');
            fabricObject = new Line([lineScaled.x1, lineScaled.y1, lineScaled.x2, lineScaled.y2], {
              stroke: annotation.color,
              strokeWidth: lineScaled.strokeWidth || 2,
              strokeDashArray: isManualLine ? [5, 5] : undefined,
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

            const isManualPolygon = annotation.label?.includes('Manual');
            const polygon = new Polygon(polygonPointsScaled, {
              stroke: annotation.color,
              fill: hexToRgba(annotation.color, 0.2),
              strokeWidth: Math.max(2, (polygonShape.strokeWidth || 2) * ((scaleX + scaleY) / 2)),
              strokeDashArray: isManualPolygon ? [5, 5] : undefined,
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
  }, [annotations, fabricCanvas, sheetId, canvasReady, imgNaturalSize, docSize]);

  // Separate effect to handle visibility changes efficiently
  useEffect(() => {
    if (!fabricCanvas || !annotations) return;

    // Update opacity of existing annotation objects based on visibility
    annotations.forEach(annotation => {
      const fabricObject = annotationObjectsRef.current.get(annotation.id);
      if (fabricObject) {
        const isVisible = visibleAnnotations.has(annotation.takeoff_item_id || '');
        fabricObject.set('opacity', isVisible ? (annotation.annotation_type === 'rectangle' ? 1 : 0.6) : 0);
      }
    });

    fabricCanvas.renderAll();
  }, [visibleAnnotations, fabricCanvas, annotations]);

  // Keyboard handler for deleting manual annotations
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool === 'select') {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject) {
          // Find the annotation ID from annotationObjectsRef
          let annotationId: string | null = null;
          annotationObjectsRef.current.forEach((obj, id) => {
            if (obj === activeObject) annotationId = id;
          });
          
          if (annotationId) {
            // Check if it's a manual annotation before deleting
            const annotation = annotations?.find(a => a.id === annotationId);
            if (annotation && annotation.label?.includes('Manual')) {
              deleteAnnotation(annotationId);
              fabricCanvas.remove(activeObject);
              
              // Decrement quantity
              decrementQuantity(annotation.takeoff_item_id);
            } else {
              toast({
                title: "Cannot delete AI annotation",
                description: "Only manually added annotations can be deleted. Use Re-extract to refresh AI annotations.",
                variant: "destructive",
              });
            }
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, activeTool, annotations, deleteAnnotation]);

  // Quantity update functions
  const incrementQuantity = async (itemId: string) => {
    const { data: item } = await supabase
      .from('takeoff_items')
      .select('quantity')
      .eq('id', itemId)
      .single();
    
    if (item) {
      await supabase
        .from('takeoff_items')
        .update({ quantity: (item.quantity || 0) + 1 })
        .eq('id', itemId);
      
      // Invalidate takeoff-items query so TakeoffTable refetches
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
      
      toast({
        title: "Quantity updated",
        description: "+1 added to item",
      });
    }
  };

  const incrementQuantityBy = async (itemId: string, amount: number) => {
    const { data: item } = await supabase
      .from('takeoff_items')
      .select('quantity')
      .eq('id', itemId)
      .single();
    
    if (item) {
      await supabase
        .from('takeoff_items')
        .update({ quantity: (item.quantity || 0) + amount })
        .eq('id', itemId);
      
      // Invalidate takeoff-items query so TakeoffTable refetches
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
      
      toast({
        title: "Quantity updated",
        description: `+${amount.toFixed(2)} added to item`,
      });
    }
  };

  const decrementQuantity = async (itemId: string) => {
    const { data: item } = await supabase
      .from('takeoff_items')
      .select('quantity')
      .eq('id', itemId)
      .single();
    
    if (item) {
      const newQty = Math.max(0, (item.quantity || 0) - 1);
      await supabase
        .from('takeoff_items')
        .update({ quantity: newQty })
        .eq('id', itemId);
      
      // Invalidate takeoff-items query so TakeoffTable refetches
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
      
      toast({
        title: "Quantity updated",
        description: "-1 from item",
      });
    }
  };

  const handleToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
    console.info(`Tool activated: ${tool}`);
    if (!fabricCanvas) return;

    // Sanity check: log current Fabric layer styles to confirm they're correct
    const upper = (fabricCanvas as any).upperCanvasEl || (fabricCanvas as any).upper?.el;
    const wrapper = (fabricCanvas as any).wrapperEl || upper?.parentElement;
    console.info('🔍 Tool sanity check:', {
      tool,
      upperZ: upper?.style?.zIndex,
      upperPointer: upper?.style?.pointerEvents,
      wrapperZ: wrapper?.style?.zIndex,
      wrapperPointer: wrapper?.style?.pointerEvents
    });

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = tool === 'select';
    
    // Clear only TOOL-SPECIFIC event listeners, NOT the persistent diagnostic/selection handlers
    // Get references to persistent handlers to preserve them
    const persistentMouseDown = (fabricCanvas as any).__persistentMouseDown;
    const persistentSelCreated = (fabricCanvas as any).__persistentSelCreated;
    const persistentSelCleared = (fabricCanvas as any).__persistentSelCleared;
    
    // Remove tool handlers (stored on previous tool activation)
    if ((fabricCanvas as any).__toolMouseDown) {
      fabricCanvas.off('mouse:down', (fabricCanvas as any).__toolMouseDown);
    }
    if ((fabricCanvas as any).__toolMouseMove) {
      fabricCanvas.off('mouse:move', (fabricCanvas as any).__toolMouseMove);
    }
    if ((fabricCanvas as any).__toolMouseUp) {
      fabricCanvas.off('mouse:up', (fabricCanvas as any).__toolMouseUp);
    }
    
    // Clear stored tool handlers
    (fabricCanvas as any).__toolMouseDown = null;
    (fabricCanvas as any).__toolMouseMove = null;
    (fabricCanvas as any).__toolMouseUp = null;

    if (!selectedTakeoffItem && tool !== 'select') {
      toast({
        title: "Select an item first",
        description: "Select a takeoff item from the table to annotate",
      });
      return;
    }

    if (!selectedTakeoffItem) return;

    // COUNT TOOL - click to place markers
    if (tool === 'count') {
      const countMouseDown = (e: any) => {
        if (!sheetId) return;
        
        // Use getPointer for correct coordinates in canvas space
        const p = fabricCanvas.getPointer(e.e, true);
        console.info(`Count tool mouse:down at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) [zoom: ${zoom}]`);
        
        const circle = new Circle({
          left: p.x,
          top: p.y,
          radius: 15,
          fill: selectedTakeoffItem.color,
          stroke: selectedTakeoffItem.color,
          strokeWidth: 2,
          opacity: 0.6,
          selectable: true,
          evented: true,
        });
        
        fabricCanvas.add(circle);
        
        // Transform screen coordinates to document coordinates for storage
        const refW = sheet?.ai_processing_width || imgNaturalSize?.width || displayedSize?.width || 1;
        const refH = sheet?.ai_processing_height || imgNaturalSize?.height || displayedSize?.height || 1;
        const canvasW = displayedSize?.width || 1;
        const canvasH = displayedSize?.height || 1;
        const scaleX = refW / canvasW;
        const scaleY = refH / canvasH;
        
        const circleGeometry = circle.toJSON();
        circleGeometry.left = p.x * scaleX;
        circleGeometry.top = p.y * scaleY;
        
        // Save to database with document coordinates
        saveAnnotation({
          takeoff_item_id: selectedTakeoffItem.id,
          takeoff_sheet_id: sheetId,
          annotation_type: 'circle',
          geometry: circleGeometry,
          color: selectedTakeoffItem.color,
        } as any);
        
        // Remove the temp shape - it will be recreated from DB with proper tracking
        fabricCanvas.remove(circle);

        // Increment quantity
        incrementQuantity(selectedTakeoffItem.id);
      };
      
      (fabricCanvas as any).__toolMouseDown = countMouseDown;
      fabricCanvas.on('mouse:down', countMouseDown);
    }

    // RECTANGLE TOOL - click and drag
    if (tool === 'rectangle') {
      let rect: Rect | null = null;
      let isDrawing = false;
      let origX = 0, origY = 0;

      const rectMouseDown = (e: any) => {
        if (!sheetId) return;
        
        // Use getPointer for correct coordinates in canvas space
        const p = fabricCanvas.getPointer(e.e, true);
        console.info(`Rectangle tool mouse:down at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) [zoom: ${zoom}]`);
        isDrawing = true;
        origX = p.x;
        origY = p.y;
        
        rect = new Rect({
          left: origX,
          top: origY,
          width: 0,
          height: 0,
          fill: hexToRgba(selectedTakeoffItem.color, 0.2),
          stroke: selectedTakeoffItem.color,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: true,
          evented: true,
        });
        fabricCanvas.add(rect);
      };

      const rectMouseMove = (e: any) => {
        if (!isDrawing || !rect) return;
        
        // Use getPointer for correct coordinates
        const p = fabricCanvas.getPointer(e.e, true);
        const width = Math.abs(p.x - origX);
        const height = Math.abs(p.y - origY);
        rect.set({
          width,
          height,
          left: Math.min(p.x, origX),
          top: Math.min(p.y, origY),
        });
        fabricCanvas.renderAll();
      };

      const rectMouseUp = (e: any) => {
        if (!isDrawing || !rect || !sheetId) return;
        isDrawing = false;
        
        // Only save if rectangle has meaningful size
        if ((rect.width || 0) > 5 && (rect.height || 0) > 5) {
          // Transform screen coordinates to document coordinates for storage
          // Get reference dimensions (AI processing or natural image size)
          const refW = sheet?.ai_processing_width || imgNaturalSize?.width || displayedSize?.width || 1;
          const refH = sheet?.ai_processing_height || imgNaturalSize?.height || displayedSize?.height || 1;
          const canvasW = displayedSize?.width || 1;
          const canvasH = displayedSize?.height || 1;
          
          // Compute inverse scale: screen -> document
          const scaleX = refW / canvasW;
          const scaleY = refH / canvasH;
          
          // Create geometry in document coordinates
          const rectGeometry = rect.toJSON();
          rectGeometry.left = (rect.left || 0) * scaleX;
          rectGeometry.top = (rect.top || 0) * scaleY;
          rectGeometry.width = (rect.width || 0) * scaleX;
          rectGeometry.height = (rect.height || 0) * scaleY;
          
          console.info('Saving rectangle in document coords:', { 
            screen: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            document: { left: rectGeometry.left, top: rectGeometry.top, width: rectGeometry.width, height: rectGeometry.height },
            scale: { x: scaleX, y: scaleY }
          });
          
          saveAnnotation({
            takeoff_item_id: selectedTakeoffItem.id,
            takeoff_sheet_id: sheetId,
            annotation_type: 'rectangle',
            geometry: rectGeometry,
            color: selectedTakeoffItem.color,
          } as any);
          
          // Remove the temp shape - it will be recreated from DB with proper tracking
          fabricCanvas.remove(rect);
          
          // Increment quantity by 1
          incrementQuantity(selectedTakeoffItem.id);
        } else {
          fabricCanvas.remove(rect);
        }
        
        rect = null;
      };
      
      (fabricCanvas as any).__toolMouseDown = rectMouseDown;
      (fabricCanvas as any).__toolMouseMove = rectMouseMove;
      (fabricCanvas as any).__toolMouseUp = rectMouseUp;
      fabricCanvas.on('mouse:down', rectMouseDown);
      fabricCanvas.on('mouse:move', rectMouseMove);
      fabricCanvas.on('mouse:up', rectMouseUp);
    }

    // LINE TOOL - click and drag
    if (tool === 'line') {
      let line: Line | null = null;
      let isDrawing = false;

      const lineMouseDown = (e: any) => {
        if (!sheetId) return;
        
        // Use getPointer for correct coordinates
        const p = fabricCanvas.getPointer(e.e, true);
        console.info(`Line tool mouse:down at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) [zoom: ${zoom}]`);
        isDrawing = true;
        
        line = new Line([p.x, p.y, p.x, p.y], {
          stroke: selectedTakeoffItem.color,
          strokeWidth: 3,
          strokeDashArray: [5, 5],
          selectable: true,
          evented: true,
        });
        fabricCanvas.add(line);
      };

      const lineMouseMove = (e: any) => {
        if (!isDrawing || !line) return;
        
        // Use getPointer for correct coordinates
        const p = fabricCanvas.getPointer(e.e, true);
        line.set({ x2: p.x, y2: p.y });
        fabricCanvas.renderAll();
      };

      const lineMouseUp = (e: any) => {
        if (!isDrawing || !line || !sheetId) return;
        isDrawing = false;
        
        // Calculate line length in pixels
        const x1 = line.x1 || 0;
        const y1 = line.y1 || 0;
        const x2 = line.x2 || 0;
        const y2 = line.y2 || 0;
        const pixelLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        
        // Only save if line has meaningful length
        if (pixelLength > 10) {
          // Transform screen coordinates to document coordinates for storage
          const refW = sheet?.ai_processing_width || imgNaturalSize?.width || displayedSize?.width || 1;
          const refH = sheet?.ai_processing_height || imgNaturalSize?.height || displayedSize?.height || 1;
          const canvasW = displayedSize?.width || 1;
          const canvasH = displayedSize?.height || 1;
          const scaleX = refW / canvasW;
          const scaleY = refH / canvasH;
          
          const lineGeometry = line.toJSON();
          lineGeometry.x1 = x1 * scaleX;
          lineGeometry.y1 = y1 * scaleY;
          lineGeometry.x2 = x2 * scaleX;
          lineGeometry.y2 = y2 * scaleY;
          
          saveAnnotation({
            takeoff_item_id: selectedTakeoffItem.id,
            takeoff_sheet_id: sheetId,
            annotation_type: 'line',
            geometry: lineGeometry,
            color: selectedTakeoffItem.color,
          } as any);
          
          // Remove the temp shape - it will be recreated from DB with proper tracking
          fabricCanvas.remove(line);
          
          // Increment quantity by 1 (user can adjust manually if needed)
          incrementQuantity(selectedTakeoffItem.id);
        } else {
          fabricCanvas.remove(line);
        }
        
        line = null;
      };
      
      (fabricCanvas as any).__toolMouseDown = lineMouseDown;
      (fabricCanvas as any).__toolMouseMove = lineMouseMove;
      (fabricCanvas as any).__toolMouseUp = lineMouseUp;
      fabricCanvas.on('mouse:down', lineMouseDown);
      fabricCanvas.on('mouse:move', lineMouseMove);
      fabricCanvas.on('mouse:up', lineMouseUp);
    }

    // POLYGON TOOL - multi-click
    if (tool === 'polygon') {
      const points: { x: number; y: number }[] = [];
      const tempCircles: Circle[] = [];
      const tempLines: Line[] = [];
      let previewLine: Line | null = null;

      const finishPolygon = () => {
        if (points.length < 3) return;
        
        // Remove temporary objects
        tempCircles.forEach(c => fabricCanvas.remove(c));
        tempLines.forEach(l => fabricCanvas.remove(l));
        if (previewLine) fabricCanvas.remove(previewLine);
        
        // Transform screen coordinates to document coordinates for storage
        // Get reference dimensions (AI processing or natural image size)
        const refW = sheet?.ai_processing_width || imgNaturalSize?.width || displayedSize?.width || 1;
        const refH = sheet?.ai_processing_height || imgNaturalSize?.height || displayedSize?.height || 1;
        const canvasW = displayedSize?.width || 1;
        const canvasH = displayedSize?.height || 1;
        
        // Compute inverse scale: screen -> document
        const scaleX = refW / canvasW;
        const scaleY = refH / canvasH;
        
        // Transform points to document coordinates
        const documentPoints = points.map(p => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        }));
        
        console.info('Saving polygon in document coords:', { 
          screenPoints: points.slice(0, 2),
          documentPoints: documentPoints.slice(0, 2),
          scale: { x: scaleX, y: scaleY }
        });
        
        // Create final polygon (using screen coords for display)
        const polygon = new Polygon(points, {
          fill: hexToRgba(selectedTakeoffItem.color, 0.2),
          stroke: selectedTakeoffItem.color,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: true,
          evented: true,
        });
        fabricCanvas.add(polygon);
        fabricCanvas.renderAll();
        
        // Save to database with DOCUMENT coordinates
        if (sheetId) {
          saveAnnotation({
            takeoff_item_id: selectedTakeoffItem.id,
            takeoff_sheet_id: sheetId,
            annotation_type: 'polygon',
            geometry: { points: documentPoints },
            color: selectedTakeoffItem.color,
          } as any);
          
          // Remove the temp shape - it will be recreated from DB with proper tracking
          fabricCanvas.remove(polygon);
          
          // Increment quantity by 1
          incrementQuantity(selectedTakeoffItem.id);
        }
        
        // Reset
        points.length = 0;
        tempCircles.length = 0;
        tempLines.length = 0;
        previewLine = null;
        
        // Switch back to select tool
        setActiveTool('select');
        handleToolClick('select');
      };

      const polygonMouseDown = (e: any) => {
        if (!sheetId) return;
        
        // Use getPointer for correct coordinates
        const p = fabricCanvas.getPointer(e.e, true);
        console.info(`Polygon tool mouse:down at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) [zoom: ${zoom}], points: ${points.length}`);
        
        // Check for double-click timing to finish
        const now = Date.now();
        const lastClickTime = (fabricCanvas as any)._lastPolygonClick || 0;
        if (now - lastClickTime < 300 && points.length >= 3) {
          // Finish polygon
          finishPolygon();
          return;
        }
        (fabricCanvas as any)._lastPolygonClick = now;
        
        points.push({ x: p.x, y: p.y });
        
        // Draw point marker
        const circle = new Circle({
          left: p.x - 4,
          top: p.y - 4,
          radius: 4,
          fill: selectedTakeoffItem.color,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(circle);
        tempCircles.push(circle);
        
        // Draw line to previous point
        if (points.length > 1) {
          const prevPoint = points[points.length - 2];
          const line = new Line([prevPoint.x, prevPoint.y, p.x, p.y], {
            stroke: selectedTakeoffItem.color,
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(line);
          tempLines.push(line);
        }
        
        fabricCanvas.renderAll();
      };

      const polygonMouseMove = (e: any) => {
        if (points.length === 0) return;
        
        // Use getPointer for correct coordinates
        const p = fabricCanvas.getPointer(e.e, true);
        
        // Show preview line from last point to cursor
        if (previewLine) {
          fabricCanvas.remove(previewLine);
        }
        
        const lastPoint = points[points.length - 1];
        previewLine = new Line([lastPoint.x, lastPoint.y, p.x, p.y], {
          stroke: selectedTakeoffItem.color,
          strokeWidth: 1,
          strokeDashArray: [3, 3],
          opacity: 0.5,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(previewLine);
        fabricCanvas.renderAll();
      };
      
      (fabricCanvas as any).__toolMouseDown = polygonMouseDown;
      (fabricCanvas as any).__toolMouseMove = polygonMouseMove;
      // Store finishPolygon for key handler
      (fabricCanvas as any).__finishPolygon = finishPolygon;
      fabricCanvas.on('mouse:down', polygonMouseDown);
      fabricCanvas.on('mouse:move', polygonMouseMove);

      // Listen for Escape key to cancel polygon
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && points.length > 0) {
          tempCircles.forEach(c => fabricCanvas.remove(c));
          tempLines.forEach(l => fabricCanvas.remove(l));
          if (previewLine) fabricCanvas.remove(previewLine);
          points.length = 0;
          tempCircles.length = 0;
          tempLines.length = 0;
          previewLine = null;
          fabricCanvas.renderAll();
        } else if (e.key === 'Enter' && points.length >= 3) {
          finishPolygon();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      (fabricCanvas as any)._polygonKeyHandler = handleKeyDown;
    } else {
      // Clean up polygon key handler
      const handler = (fabricCanvas as any)._polygonKeyHandler;
      if (handler) {
        window.removeEventListener('keydown', handler);
        delete (fabricCanvas as any)._polygonKeyHandler;
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
    // Don't pan if we're in drawing mode or if click was on the Fabric canvas
    if (activeTool !== 'select') return;
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'canvas') return;
    if (zoom <= 1) return;
    
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

  const isPDF = !!sheet?.file_name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <div className="flex items-center gap-4 px-4 py-3 min-h-16 border-b">
        <DrawingToolbar 
          activeTool={activeTool}
          onToolClick={handleToolClick}
          onCalibrateScale={() => setShowScaleDialog(true)}
          selectedScale={sheet?.drawing_scale}
          onScaleChange={handleScaleSelect}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
        />
      </div>

      {/* Drawing Instructions Panel */}
      {activeTool !== 'select' && selectedTakeoffItem && (
        <div className="absolute top-20 left-4 bg-background border rounded-lg p-3 shadow-lg z-50 max-w-xs">
          <h4 className="font-semibold text-sm mb-2">Drawing Mode Active</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {activeTool === 'count' && <p>Click on the plan to place count markers</p>}
            {activeTool === 'line' && <p>Click and drag to draw a line</p>}
            {activeTool === 'rectangle' && <p>Click and drag to draw a rectangle</p>}
            {activeTool === 'polygon' && (
              <>
                <p>Click to place points</p>
                <p>Double-click or press Enter to finish</p>
                <p>Press Escape to cancel</p>
              </>
            )}
            <p className="mt-2 pt-2 border-t">
              <span className="font-medium">Selected:</span> {selectedTakeoffItem.category}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div 
                className="w-4 h-4 rounded border" 
                style={{ backgroundColor: selectedTakeoffItem.color }}
              />
              <span>Drawing in this color</span>
            </div>
          </div>
        </div>
      )}


      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
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
          {/* STAGE CONTAINER: Strict z-index layering for pointer events */}
          {/* key={sheetId} forces complete DOM remount on sheet change to prevent Fabric/React conflicts */}
          <div 
            ref={stageRef}
            key={sheetId || 'no-sheet'}
            className="relative"
            style={{ 
              width: displayedSize?.width || 800,
              height: displayedSize?.height || 600,
            }}
          >
            {/* Layer 0: PDF/Image (base, no pointer events) */}
            <div 
              className="absolute inset-0"
              style={{ zIndex: 0, pointerEvents: 'none' }}
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
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={(page) => {
                      setPageWidth(page.width);
                      
                      // Get original PDF page dimensions (at scale 1)
                      const viewport = page.originalWidth && page.originalHeight
                        ? { width: page.originalWidth, height: page.originalHeight }
                        : page.view 
                          ? { width: page.view[2] - page.view[0], height: page.view[3] - page.view[1] }
                          : null;
                      
                      if (viewport) {
                        setDocSize(viewport);
                        setImgNaturalSize(viewport);
                        setDocLoaded(true);
                        
                        const scaleX = page.width / viewport.width;
                        const scaleY = page.height / viewport.height;
                        console.debug(`PDF: displayed=${page.width}x${page.height}, original=${viewport.width}x${viewport.height}, scale=${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
                      }
                      
                      setDisplayedSize({
                        width: page.width,
                        height: page.height,
                      });
                    }}
                  />
                </Document>
              ) : (
                <img 
                  src={fileUrl} 
                  alt="Drawing sheet" 
                  className="max-w-full"
                  style={{ pointerEvents: 'none' }}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    
                    setDocSize({
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                    });
                    setImgNaturalSize({
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                    });
                    setDocLoaded(true);
                    
                    setDisplayedSize({
                      width: img.width,
                      height: img.height,
                    });
                    
                    const sx = img.width / img.naturalWidth;
                    const sy = img.height / img.naturalHeight;
                    console.debug(`IMAGE: displayed=${img.width}x${img.height}, natural=${img.naturalWidth}x${img.naturalHeight}, scale=${sx.toFixed(2)}x${sy.toFixed(2)}`);
                  }}
                />
              )}
            </div>

            {/* Layer 10: DOMOverlays SVG (no pointer events) */}
            {(
              (canvasReady && imgNaturalSize) || 
              (sheet?.ai_processing_width && sheet?.ai_processing_height && displayedSize)
            ) && (
              <div 
                className="absolute inset-0"
                style={{ zIndex: 10, pointerEvents: 'none' }}
              >
                <DOMOverlays
                  annotations={annotations || []}
                  visibleAnnotations={visibleAnnotations}
                  sheet={sheet}
                  canvasSize={
                    displayedSize || 
                    (fabricCanvas 
                      ? { width: fabricCanvas.getWidth(), height: fabricCanvas.getHeight() }
                      : { width: 800, height: 600 })
                  }
                  imgNaturalSize={imgNaturalSize || docSize}
                  aiProcessingSize={
                    sheet?.ai_processing_width && sheet?.ai_processing_height
                      ? { width: sheet.ai_processing_width, height: sheet.ai_processing_height }
                      : null
                  }
                />
              </div>
            )}
            
            {/* Layer 100: Fabric.js canvas (TOPMOST, receives all pointer events) */}
            {/* NOTE: Do NOT add inline styles here - Fabric wraps this canvas and we style the wrapper in useEffect */}
            <canvas 
              ref={canvasElRef}
              width={displayedSize?.width || 800}
              height={displayedSize?.height || 600}
            />
            
            {/* Empty state banner (info only, no pointer events) */}
            {annotations && annotations.length === 0 && (
              <div 
                className="absolute top-2 left-2 px-2 py-1 rounded bg-muted text-foreground text-xs shadow" 
                style={{ zIndex: 200, pointerEvents: 'none' }}
              >
                No overlays found for this sheet
              </div>
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
