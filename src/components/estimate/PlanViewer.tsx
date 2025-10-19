import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Canvas as FabricCanvas, Circle, Line, Rect, Polygon } from "fabric";
import { DrawingToolbar } from "./DrawingToolbar";
import { ScaleCalibrationDialog } from "./ScaleCalibrationDialog";
import { AnnotationVisibilityPanel } from "./AnnotationVisibilityPanel";
import { useAnnotations } from "@/hooks/useAnnotations";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PlanViewerProps {
  sheetId: string | null;
  takeoffId: string;
  selectedTakeoffItem: { id: string; color: string; category: string } | null;
}

type DrawingTool = 'select' | 'count' | 'line' | 'rectangle' | 'polygon';

export function PlanViewer({ sheetId, takeoffId, selectedTakeoffItem }: PlanViewerProps) {
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
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [visibleAnnotations, setVisibleAnnotations] = useState<Set<string>>(new Set());
  const annotationObjectsRef = useRef<Map<string, any>>(new Map());
  
  const { toast } = useToast();
  const { annotations, saveAnnotation, deleteAnnotation, isSaving } = useAnnotations(sheetId);

  // Fetch takeoff items for visibility panel
  const { data: takeoffItems } = useQuery({
    queryKey: ['takeoff-items-for-annotations', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      
      const { data, error } = await supabase
        .from('takeoff_items')
        .select('id, category, color')
        .eq('takeoff_sheet_id', sheetId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!sheetId && isReviewMode,
  });

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

  // Sync Fabric.js canvas zoom with state
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setViewportTransform([zoom, 0, 0, zoom, pan.x, pan.y]);
      fabricCanvas.renderAll();
    }
  }, [zoom, pan, fabricCanvas]);

  // Load and display annotations
  useEffect(() => {
    if (!fabricCanvas || !annotations || !sheetId) return;

    // Clear existing annotation objects
    annotationObjectsRef.current.forEach(obj => fabricCanvas.remove(obj));
    annotationObjectsRef.current.clear();

    // Load annotations from database
    annotations.forEach(annotation => {
      try {
        const shape = typeof annotation.geometry === 'string' 
          ? JSON.parse(annotation.geometry as string) 
          : annotation.geometry;
        let fabricObject;

        switch (annotation.annotation_type) {
          case 'circle':
            fabricObject = new Circle({
              ...(shape as any),
              stroke: annotation.color,
              fill: annotation.color,
              opacity: visibleAnnotations.has(annotation.takeoff_item_id || '') ? 0.6 : 0,
              selectable: isReviewMode,
              evented: isReviewMode,
            });
            break;
          case 'rectangle':
            fabricObject = new Rect({
              ...(shape as any),
              stroke: annotation.color,
              fill: 'transparent',
              opacity: visibleAnnotations.has(annotation.takeoff_item_id || '') ? 0.6 : 0,
              selectable: isReviewMode,
              evented: isReviewMode,
            });
            break;
          case 'line':
            const lineShape = shape as any;
            fabricObject = new Line([lineShape.x1, lineShape.y1, lineShape.x2, lineShape.y2], {
              ...lineShape,
              stroke: annotation.color,
              opacity: visibleAnnotations.has(annotation.takeoff_item_id || '') ? 1 : 0,
              selectable: isReviewMode,
              evented: isReviewMode,
            });
            break;
          case 'polygon':
            fabricObject = new Polygon((shape as any).points, {
              ...(shape as any),
              stroke: annotation.color,
              fill: 'transparent',
              opacity: visibleAnnotations.has(annotation.takeoff_item_id || '') ? 0.6 : 0,
              selectable: isReviewMode,
              evented: isReviewMode,
            });
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

    fabricCanvas.renderAll();
  }, [annotations, fabricCanvas, isReviewMode, visibleAnnotations, sheetId]);

  const handleToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = tool === 'select';

    // Only allow drawing in review mode with a selected item
    if (isReviewMode && selectedTakeoffItem && tool === 'count') {
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

        // Add to visible annotations
        setVisibleAnnotations(prev => new Set(prev).add(selectedTakeoffItem.id));
      });
    } else if (!isReviewMode || !selectedTakeoffItem) {
      fabricCanvas.off('mouse:down');
      if (tool !== 'select' && isReviewMode) {
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

  // Fetch takeoff items for visibility panel
  const { data: annotationItems } = useQuery({
    queryKey: ['takeoff-items-for-annotations', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      
      const { data, error } = await supabase
        .from('takeoff_items')
        .select('id, category, color')
        .eq('takeoff_sheet_id', sheetId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!sheetId && isReviewMode,
  });

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
        />
        
        <div className="flex items-center gap-2 ml-auto">
          <Switch
            id="review-mode"
            checked={isReviewMode}
            onCheckedChange={setIsReviewMode}
          />
          <Label htmlFor="review-mode">Review Mode</Label>
        </div>

        {isReviewMode && selectedTakeoffItem && (
          <Badge variant="secondary" className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedTakeoffItem.color }}
            />
            {selectedTakeoffItem.category}
          </Badge>
        )}
      </div>

      <div 
        className="flex-1 overflow-auto p-4"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : zoom > 1 && activeTool === 'select' ? 'grab' : 'default' }}
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
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page 
                pageNumber={sheet?.page_number || 1}
                width={pageWidth}
                onLoadSuccess={(page) => {
                  setPageWidth(page.width);
                  if (fabricCanvas) {
                    fabricCanvas.setDimensions({
                      width: page.width,
                      height: page.height,
                    });
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
                }
              }}
            />
          )}
          
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ zIndex: 10 }}
          />
        </div>
      </div>

      <ScaleCalibrationDialog
        open={showScaleDialog}
        onOpenChange={setShowScaleDialog}
        sheetId={sheetId}
        fabricCanvas={fabricCanvas}
      />

      {isReviewMode && annotationItems && annotationItems.length > 0 && (
        <AnnotationVisibilityPanel
          takeoffItems={annotationItems.map(item => ({
            id: item.id,
            category: item.category,
            color: item.color || '#3b82f6',
            annotationCount: annotations.filter(a => a.takeoff_item_id === item.id).length,
          }))}
          visibleAnnotations={visibleAnnotations}
          onToggle={(itemId) => {
            const newVisible = new Set(visibleAnnotations);
            if (newVisible.has(itemId)) {
              newVisible.delete(itemId);
            } else {
              newVisible.add(itemId);
            }
            setVisibleAnnotations(newVisible);
          }}
        />
      )}
    </div>
  );
}
