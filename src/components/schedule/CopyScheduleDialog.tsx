import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useProjects } from "@/hooks/useProjects";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { Loader2 } from "lucide-react";

interface CopyScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onCopySchedule: (options: CopyScheduleOptions) => Promise<void>;
}

export interface CopyScheduleOptions {
  sourceProjectId: string;
  mode: 'replace' | 'append';
  shiftDays?: number;
}

export function CopyScheduleDialog({ 
  isOpen, 
  onClose, 
  currentProjectId, 
  onCopySchedule 
}: CopyScheduleDialogProps) {
  const [sourceProjectId, setSourceProjectId] = useState<string>("");
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [shiftDays, setShiftDays] = useState<number>(0);
  const [applyDateShift, setApplyDateShift] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: projects } = useProjects();
  const { data: sourceTasks } = useProjectTasks(sourceProjectId);

  // Filter out current project from selection
  const availableProjects = projects?.filter(p => p.id !== currentProjectId) || [];

  const handleCopy = async () => {
    if (!sourceProjectId) return;
    
    setIsLoading(true);
    try {
      await onCopySchedule({
        sourceProjectId,
        mode,
        shiftDays: applyDateShift ? shiftDays : undefined
      });
      onClose();
    } catch (error) {
      console.error('Error copying schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSourceProjectId("");
    setMode('replace');
    setShiftDays(0);
    setApplyDateShift(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Schedule</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="source-project">Source Project</Label>
            <Select value={sourceProjectId} onValueChange={setSourceProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project to copy from" />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceProjectId && sourceTasks && (
            <div className="text-sm text-muted-foreground">
              Found {sourceTasks.length} tasks to copy
            </div>
          )}

          <div>
            <Label>Copy Mode</Label>
            <RadioGroup value={mode} onValueChange={(value: 'replace' | 'append') => setMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace">Replace existing schedule</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="append" id="append" />
                <Label htmlFor="append">Append to existing schedule</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="date-shift" 
                checked={applyDateShift}
                onCheckedChange={(checked) => setApplyDateShift(checked === true)}
              />
              <Label htmlFor="date-shift">Adjust start dates</Label>
            </div>
            
            {applyDateShift && (
              <div>
                <Label htmlFor="shift-days">Days to shift (positive = later, negative = earlier)</Label>
                <Input
                  id="shift-days"
                  type="number"
                  value={shiftDays}
                  onChange={(e) => setShiftDays(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCopy}
              disabled={!sourceProjectId || isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Copy Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}