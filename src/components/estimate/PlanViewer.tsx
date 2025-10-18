import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Canvas as FabricCanvas, Circle, Line, Rect, Polygon } from "fabric";
import { DrawingToolbar } from "./DrawingToolbar";
import { ScaleCalibrationDialog } from "./ScaleCalibrationDialog";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PlanViewerProps {
  sheetId: string | null;
  takeoffId: string;
}

type DrawingTool = 'select' | 'count' | 'line' | 'rectangle' | 'polygon';

export function PlanViewer({ sheetId, takeoffId }: PlanViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(800);

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

  const handleToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = tool === 'select';
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
      <DrawingToolbar 
        activeTool={activeTool}
        onToolClick={handleToolClick}
        onCalibrateScale={() => setShowScaleDialog(true)}
        scaleRatio={sheet?.scale_ratio}
      />

      <div className="flex-1 overflow-auto p-4">
        <div className="relative inline-block">
          {isPDF ? (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page 
                pageNumber={1}
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
    </div>
  );
}
