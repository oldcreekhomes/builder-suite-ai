import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Ruler } from "lucide-react";
import type { Canvas as FabricCanvas, Line } from "fabric";
import { useQueryClient } from "@tanstack/react-query";

interface ScaleCalibrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  fabricCanvas: FabricCanvas | null;
  displayedSize?: { width: number; height: number } | null;
  docSize?: { width: number; height: number } | null;
}

export function ScaleCalibrationDialog({ 
  open, 
  onOpenChange, 
  sheetId,
  fabricCanvas,
  displayedSize,
  docSize
}: ScaleCalibrationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualScale, setManualScale] = useState("");
  const [realDistance, setRealDistance] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Reset calibration state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsCalibrating(false);
      setCalibrationLine(null);
      setRealDistance("");
    }
  }, [open]);

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-drawing-scale', {
        body: { sheet_id: sheetId }
      });

      if (error) throw error;

      if (data.scale) {
        setManualScale(data.scale);
        if (data.confidence === 'high') {
          toast({ title: "Success", description: `Scale detected: ${data.scale}` });
        } else if (data.confidence === 'medium') {
          toast({ title: "Success", description: `Scale detected: ${data.scale} (medium confidence - please verify)` });
        } else {
          toast({ title: "Info", description: `Possible scale found: ${data.scale} (low confidence - please verify)` });
        }
      } else {
        toast({ title: "Info", description: "No scale found on drawing. Please enter manually." });
      }
    } catch (error) {
      console.error('Error detecting scale:', error);
      toast({ title: "Error", description: "Failed to detect scale", variant: "destructive" });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSaveManualScale = async () => {
    if (!manualScale) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('takeoff_sheets')
        .update({ 
          drawing_scale: manualScale,
          scale_ratio: null // Will require calibration for images
        })
        .eq('id', sheetId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['takeoff-sheet', sheetId] });
      toast({ title: "Success", description: "Scale saved" });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving scale:', error);
      toast({ title: "Error", description: "Failed to save scale", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Start calibration mode - let user draw a line on the canvas
  const handleStartCalibration = useCallback(() => {
    if (!fabricCanvas) {
      toast({ title: "Error", description: "Canvas not ready", variant: "destructive" });
      return;
    }

    setIsCalibrating(true);
    setCalibrationLine(null);
    
    toast({ 
      title: "Draw calibration line", 
      description: "Click and drag on the drawing to measure a known dimension" 
    });

    // Temporarily minimize dialog for drawing
    // User draws on canvas, we capture the line
    let isDrawing = false;
    let startX = 0, startY = 0;
    let tempLine: Line | null = null;

    const onMouseDown = (e: any) => {
      const pointer = fabricCanvas.getPointer(e.e, true);
      isDrawing = true;
      startX = pointer.x;
      startY = pointer.y;

      // Create temporary line
      const { Line: FabricLine } = require('fabric');
      tempLine = new FabricLine([startX, startY, startX, startY], {
        stroke: '#FF6B00',
        strokeWidth: 3,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(tempLine);
    };

    const onMouseMove = (e: any) => {
      if (!isDrawing || !tempLine) return;
      const pointer = fabricCanvas.getPointer(e.e, true);
      tempLine.set({ x2: pointer.x, y2: pointer.y });
      fabricCanvas.renderAll();
    };

    const onMouseUp = (e: any) => {
      if (!isDrawing || !tempLine) return;
      isDrawing = false;
      
      const pointer = fabricCanvas.getPointer(e.e, true);
      const x1 = startX;
      const y1 = startY;
      const x2 = pointer.x;
      const y2 = pointer.y;
      
      // Calculate line length in screen pixels
      const screenLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      
      if (screenLength < 20) {
        // Too short, ignore
        fabricCanvas.remove(tempLine);
        tempLine = null;
        return;
      }

      // Transform to document coordinates
      const refW = docSize?.width || displayedSize?.width || 1;
      const refH = docSize?.height || displayedSize?.height || 1;
      const canvasW = displayedSize?.width || 1;
      const canvasH = displayedSize?.height || 1;
      const scaleX = refW / canvasW;
      const scaleY = refH / canvasH;

      const docLine = {
        x1: x1 * scaleX,
        y1: y1 * scaleY,
        x2: x2 * scaleX,
        y2: y2 * scaleY,
      };

      console.info('[Calibration] Line drawn:', { screen: { x1, y1, x2, y2, length: screenLength }, doc: docLine });
      
      setCalibrationLine(docLine);
      
      // Clean up
      fabricCanvas.remove(tempLine);
      tempLine = null;
      
      // Remove handlers
      fabricCanvas.off('mouse:down', onMouseDown);
      fabricCanvas.off('mouse:move', onMouseMove);
      fabricCanvas.off('mouse:up', onMouseUp);
      
      toast({ title: "Line captured", description: "Now enter the real-world distance in feet" });
    };

    fabricCanvas.on('mouse:down', onMouseDown);
    fabricCanvas.on('mouse:move', onMouseMove);
    fabricCanvas.on('mouse:up', onMouseUp);

    // Store cleanup function
    (fabricCanvas as any).__calibrationCleanup = () => {
      fabricCanvas.off('mouse:down', onMouseDown);
      fabricCanvas.off('mouse:move', onMouseMove);
      fabricCanvas.off('mouse:up', onMouseUp);
      if (tempLine) {
        fabricCanvas.remove(tempLine);
      }
    };
  }, [fabricCanvas, displayedSize, docSize, toast]);

  // Calculate and save calibration
  const handleSaveCalibration = async () => {
    if (!calibrationLine || !realDistance) {
      toast({ title: "Error", description: "Draw a line and enter the distance first", variant: "destructive" });
      return;
    }

    const realFeet = parseFloat(realDistance);
    if (isNaN(realFeet) || realFeet <= 0) {
      toast({ title: "Error", description: "Enter a valid distance in feet", variant: "destructive" });
      return;
    }

    // Calculate line length in document pixels
    const dx = calibrationLine.x2 - calibrationLine.x1;
    const dy = calibrationLine.y2 - calibrationLine.y1;
    const docPixelLength = Math.sqrt(dx * dx + dy * dy);

    // pixelsPerFoot = documentPixels / realFeet
    const pixelsPerFoot = docPixelLength / realFeet;

    console.info('[Calibration] Computed:', { 
      docPixelLength, 
      realFeet, 
      pixelsPerFoot 
    });

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('takeoff_sheets')
        .update({ 
          scale_ratio: pixelsPerFoot,
          // Keep drawing_scale for display purposes
        })
        .eq('id', sheetId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['takeoff-sheet', sheetId] });
      toast({ 
        title: "Calibration saved", 
        description: `Scale ratio: ${pixelsPerFoot.toFixed(2)} pixels/foot` 
      });
      
      setIsCalibrating(false);
      setCalibrationLine(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving calibration:', error);
      toast({ title: "Error", description: "Failed to save calibration", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup calibration handlers when dialog closes
  useEffect(() => {
    return () => {
      if (fabricCanvas && (fabricCanvas as any).__calibrationCleanup) {
        (fabricCanvas as any).__calibrationCleanup();
        delete (fabricCanvas as any).__calibrationCleanup;
      }
    };
  }, [fabricCanvas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Drawing Scale</DialogTitle>
          <DialogDescription>
            {isCalibrating 
              ? "Draw a line on a known dimension, then enter the real distance"
              : "AI can automatically detect the scale, or calibrate manually"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!isCalibrating && (
            <>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAutoDetect}
                  disabled={isDetecting}
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Detecting Scale...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Auto-Detect Scale
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  AI will search for scale notation on the drawing
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter manually
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-scale">Drawing Scale</Label>
                <Input
                  id="manual-scale"
                  value={manualScale}
                  onChange={(e) => setManualScale(e.target.value)}
                  placeholder="e.g., 1/4&quot; = 1'-0&quot;"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the scale notation from the drawing
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or calibrate for images
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleStartCalibration}
                  disabled={!fabricCanvas}
                >
                  <Ruler className="mr-2 h-4 w-4" />
                  Calibrate by Measuring
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Draw a line on a known dimension (required for image sheets)
                </p>
              </div>
            </>
          )}

          {isCalibrating && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                {calibrationLine ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-600">Line captured!</p>
                    <p className="text-xs text-muted-foreground">
                      Length: {Math.sqrt(
                        (calibrationLine.x2 - calibrationLine.x1) ** 2 + 
                        (calibrationLine.y2 - calibrationLine.y1) ** 2
                      ).toFixed(1)} doc pixels
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground">
                    Draw a line on the drawing over a known dimension...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="real-distance">Real-World Distance (feet)</Label>
                <Input
                  id="real-distance"
                  type="number"
                  step="0.1"
                  value={realDistance}
                  onChange={(e) => setRealDistance(e.target.value)}
                  placeholder="e.g., 10"
                  disabled={!calibrationLine}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the actual distance the line represents
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isCalibrating ? (
            <>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCalibrating(false);
                  setCalibrationLine(null);
                }}
              >
                Back
              </Button>
              <Button 
                onClick={handleSaveCalibration} 
                disabled={isSaving || !calibrationLine || !realDistance}
              >
                {isSaving ? 'Saving...' : 'Save Calibration'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveManualScale} disabled={isSaving || !manualScale}>
                {isSaving ? 'Saving...' : 'Save Scale'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}