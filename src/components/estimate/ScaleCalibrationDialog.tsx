import { useState } from "react";
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
import { Loader2, Sparkles } from "lucide-react";
import type { Canvas as FabricCanvas } from "fabric";

interface ScaleCalibrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  fabricCanvas: FabricCanvas | null;
}

export function ScaleCalibrationDialog({ 
  open, 
  onOpenChange, 
  sheetId,
  fabricCanvas 
}: ScaleCalibrationDialogProps) {
  const { toast } = useToast();
  const [manualScale, setManualScale] = useState("");
  const [realDistance, setRealDistance] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

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
      // Parse scale like "1/4\" = 1'-0\"" into a ratio
      // For now, just save the text - can add parsing logic later
      const { error } = await supabase
        .from('takeoff_sheets')
        .update({ 
          drawing_scale: manualScale,
          scale_ratio: null // Will be calculated when drawing
        })
        .eq('id', sheetId);

      if (error) throw error;

      toast({ title: "Success", description: "Scale saved" });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving scale:', error);
      toast({ title: "Error", description: "Failed to save scale", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Drawing Scale</DialogTitle>
          <DialogDescription>
            AI can automatically detect the scale from your drawing
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
              AI will search for scale near elevation labels
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
              placeholder="e.g., 1/4 inch = 1 foot"
            />
            <p className="text-xs text-muted-foreground">
              Enter the scale notation from the drawing
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Or calibrate by measuring:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Draw a line on a known dimension</li>
              <li>Enter the real-world distance below</li>
              <li>Click "Calculate Scale"</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="real-distance">Known Distance (feet)</Label>
            <Input
              id="real-distance"
              type="number"
              value={realDistance}
              onChange={(e) => setRealDistance(e.target.value)}
              placeholder="e.g., 24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveManualScale} disabled={isSaving || !manualScale}>
            {isSaving ? 'Saving...' : 'Save Scale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
