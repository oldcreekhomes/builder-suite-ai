import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProjects } from "@/hooks/useProjects";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onCopySchedule: (options: CopyScheduleOptions) => Promise<void>;
}

export interface CopyScheduleOptions {
  sourceProjectId: string;
  projectStartDate: Date;
  removeAllResources: boolean;
  restartAllStartDates: boolean;
}

export function CopyScheduleDialog({ 
  isOpen, 
  onClose, 
  currentProjectId, 
  onCopySchedule 
}: CopyScheduleDialogProps) {
  const [sourceProjectId, setSourceProjectId] = useState<string>("");
  const [projectStartDate, setProjectStartDate] = useState<Date>();
  const [removeAllResources, setRemoveAllResources] = useState(false);
  const [restartAllStartDates, setRestartAllStartDates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: projects } = useProjects();
  const { data: sourceTasks } = useProjectTasks(sourceProjectId);

  // Filter out current project from selection
  const availableProjects = projects?.filter(p => p.id !== currentProjectId) || [];

  const handleCopy = async () => {
    if (!sourceProjectId || (!projectStartDate && !restartAllStartDates)) return;
    
    setIsLoading(true);
    try {
      await onCopySchedule({
        sourceProjectId,
        projectStartDate: projectStartDate || new Date(), // fallback date when restarting
        removeAllResources,
        restartAllStartDates
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
    setProjectStartDate(undefined);
    setRemoveAllResources(false);
    setRestartAllStartDates(false);
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


          <div className="flex flex-col space-y-2">
            <Label htmlFor="project-start-date">Project Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !projectStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {projectStartDate ? format(projectStartDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={projectStartDate}
                  onSelect={setProjectStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="remove-resources">Remove All Resources</Label>
            <Select value={removeAllResources.toString()} onValueChange={(value) => setRemoveAllResources(value === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No - Keep resources from source</SelectItem>
                <SelectItem value="true">Yes - Remove all resources</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="restart-dates">Restart All Start Dates</Label>
            <Select value={restartAllStartDates.toString()} onValueChange={(value) => setRestartAllStartDates(value === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No - Use project start date</SelectItem>
                <SelectItem value="true">Yes - Restart to 01/01/2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCopy}
              disabled={!sourceProjectId || (!projectStartDate && !restartAllStartDates) || isLoading}
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