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
  const [docSize, setDocSize] = useState<{ width: number; height: number } | null>(null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number } | null>(null);
  const annotationObjectsRef = useRef<Map<string, any>>(new Map());
  
  const { toast } = useToast();
  const { annotations, saveAnnotation, deleteAnnotation, isSaving } = useAnnotations(sheetId);

  // Reset canvas ready state when sheet changes
  useEffect(() => {
    setCanvasReady(false);
    setImgNaturalSize(null);
    setDocSize(null);
    setDocLoaded(false);
    setDisplayedSize(null);
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

  // Initialize Fabric.js canvas once on mount
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: 'transparent',
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Sync canvas dimensions when document loads
  useEffect(() => {
    if (!fabricCanvas || !displayedSize) return;
    
    fabricCanvas.setDimensions({
      width: displayedSize.width,
      height: displayedSize.height,
    });
    setCanvasReady(true);
    
    console.debug(`Canvas dimensions set: ${displayedSize.width}x${displayedSize.height}`);
  }, [fabricCanvas, displayedSize]);

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
      
      toast({
        title: "Quantity updated",
        description: "-1 from item",
      });
    }
  };

  const handleToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = tool === 'select';
    
    // Clear all event listeners
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:move');
    fabricCanvas.off('mouse:up');

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
        
        // Save to database with Manual label
        saveAnnotation({
          takeoff_item_id: selectedTakeoffItem.id,
          takeoff_sheet_id: sheetId,
          annotation_type: 'circle',
          geometry: circle.toJSON(),
          color: selectedTakeoffItem.color,
        } as any);

        // Increment quantity
        incrementQuantity(selectedTakeoffItem.id);
      });
    }

    // RECTANGLE TOOL - click and drag
    if (tool === 'rectangle') {
      let rect: Rect | null = null;
      let isDrawing = false;
      let origX = 0, origY = 0;

      fabricCanvas.on('mouse:down', (e) => {
        if (!e.pointer || !sheetId) return;
        isDrawing = true;
        origX = e.pointer.x;
        origY = e.pointer.y;
        
        rect = new Rect({
          left: origX,
          top: origY,
          width: 0,
          height: 0,
          fill: hexToRgba(selectedTakeoffItem.color, 0.2),
          stroke: selectedTakeoffItem.color,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        fabricCanvas.add(rect);
      });

      fabricCanvas.on('mouse:move', (e) => {
        if (!isDrawing || !rect || !e.pointer) return;
        const width = Math.abs(e.pointer.x - origX);
        const height = Math.abs(e.pointer.y - origY);
        rect.set({
          width,
          height,
          left: Math.min(e.pointer.x, origX),
          top: Math.min(e.pointer.y, origY),
        });
        fabricCanvas.renderAll();
      });

      fabricCanvas.on('mouse:up', (e) => {
        if (!isDrawing || !rect || !sheetId) return;
        isDrawing = false;
        
        // Only save if rectangle has meaningful size
        if ((rect.width || 0) > 5 && (rect.height || 0) > 5) {
          saveAnnotation({
            takeoff_item_id: selectedTakeoffItem.id,
            takeoff_sheet_id: sheetId,
            annotation_type: 'rectangle',
            geometry: rect.toJSON(),
            color: selectedTakeoffItem.color,
          } as any);
          
          // Increment quantity by 1
          incrementQuantity(selectedTakeoffItem.id);
        } else {
          fabricCanvas.remove(rect);
        }
        
        rect = null;
      });
    }

    // LINE TOOL - click and drag
    if (tool === 'line') {
      let line: Line | null = null;
      let isDrawing = false;

      fabricCanvas.on('mouse:down', (e) => {
        if (!e.pointer || !sheetId) return;
        isDrawing = true;
        
        line = new Line([e.pointer.x, e.pointer.y, e.pointer.x, e.pointer.y], {
          stroke: selectedTakeoffItem.color,
          strokeWidth: 3,
          strokeDashArray: [5, 5],
        });
        fabricCanvas.add(line);
      });

      fabricCanvas.on('mouse:move', (e) => {
        if (!isDrawing || !line || !e.pointer) return;
        line.set({ x2: e.pointer.x, y2: e.pointer.y });
        fabricCanvas.renderAll();
      });

      fabricCanvas.on('mouse:up', (e) => {
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
          saveAnnotation({
            takeoff_item_id: selectedTakeoffItem.id,
            takeoff_sheet_id: sheetId,
            annotation_type: 'line',
            geometry: line.toJSON(),
            color: selectedTakeoffItem.color,
          } as any);
          
          // Increment quantity by 1 (user can adjust manually if needed)
          incrementQuantity(selectedTakeoffItem.id);
        } else {
          fabricCanvas.remove(line);
        }
        
        line = null;
      });
    }

    // POLYGON TOOL - multi-click
    if (tool === 'polygon') {
      const points: { x: number; y: number }[] = [];
      const tempCircles: Circle[] = [];
      const tempLines: Line[] = [];
      let previewLine: Line | null = null;

      fabricCanvas.on('mouse:down', (e) => {
        if (!e.pointer || !sheetId) return;
        
        // Check for double-click timing to finish
        const now = Date.now();
        const lastClickTime = (fabricCanvas as any)._lastPolygonClick || 0;
        if (now - lastClickTime < 300 && points.length >= 3) {
          // Finish polygon
          finishPolygon();
          return;
        }
        (fabricCanvas as any)._lastPolygonClick = now;
        
        points.push({ x: e.pointer.x, y: e.pointer.y });
        
        // Draw point marker
        const circle = new Circle({
          left: e.pointer.x - 4,
          top: e.pointer.y - 4,
          radius: 4,
          fill: selectedTakeoffItem.color,
          selectable: false,
        });
        fabricCanvas.add(circle);
        tempCircles.push(circle);
        
        // Draw line to previous point
        if (points.length > 1) {
          const prevPoint = points[points.length - 2];
          const line = new Line([prevPoint.x, prevPoint.y, e.pointer.x, e.pointer.y], {
            stroke: selectedTakeoffItem.color,
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
          });
          fabricCanvas.add(line);
          tempLines.push(line);
        }
        
        fabricCanvas.renderAll();
      });

      fabricCanvas.on('mouse:move', (e) => {
        if (!e.pointer || points.length === 0) return;
        
        // Show preview line from last point to cursor
        if (previewLine) {
          fabricCanvas.remove(previewLine);
        }
        
        const lastPoint = points[points.length - 1];
        previewLine = new Line([lastPoint.x, lastPoint.y, e.pointer.x, e.pointer.y], {
          stroke: selectedTakeoffItem.color,
          strokeWidth: 1,
          strokeDashArray: [3, 3],
          opacity: 0.5,
          selectable: false,
        });
        fabricCanvas.add(previewLine);
        fabricCanvas.renderAll();
      });

      const finishPolygon = () => {
        if (points.length < 3) return;
        
        // Remove temporary objects
        tempCircles.forEach(c => fabricCanvas.remove(c));
        tempLines.forEach(l => fabricCanvas.remove(l));
        if (previewLine) fabricCanvas.remove(previewLine);
        
        // Create final polygon
        const polygon = new Polygon(points, {
          fill: hexToRgba(selectedTakeoffItem.color, 0.2),
          stroke: selectedTakeoffItem.color,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        });
        fabricCanvas.add(polygon);
        fabricCanvas.renderAll();
        
        // Save to database
        if (sheetId) {
          saveAnnotation({
            takeoff_item_id: selectedTakeoffItem.id,
            takeoff_sheet_id: sheetId,
            annotation_type: 'polygon',
            geometry: { points },
            color: selectedTakeoffItem.color,
          } as any);
          
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

  const isPDF = !!sheet?.file_name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <div className="flex items-center gap-4 px-4 py-2 border-b">
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
          
          {/* Fabric.js canvas for drawing */}
          <canvas 
            ref={canvasRef}
            width={displayedSize?.width || 800}
            height={displayedSize?.height || 600}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ zIndex: 400 }}
          />
          
          {/* Empty state banner */}
          {annotations && annotations.length === 0 && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded bg-muted text-foreground text-xs shadow" style={{ zIndex: 600, pointerEvents: 'none' }}>
              No overlays found for this sheet
            </div>
          )}

          {(
            (canvasReady && imgNaturalSize) || 
            (sheet?.ai_processing_width && sheet?.ai_processing_height && displayedSize)
          ) && (
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
          )}
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
