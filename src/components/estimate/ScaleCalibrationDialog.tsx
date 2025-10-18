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
import { toast } from "sonner";
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
  const [manualScale, setManualScale] = useState("");
  const [realDistance, setRealDistance] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

      toast.success('Scale saved');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving scale:', error);
      toast.error('Failed to save scale');
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
            Set the scale for accurate measurements
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
