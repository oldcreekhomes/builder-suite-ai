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
  const [isLoading, setIsLoading] = useState(false);

  const { data: projects } = useProjects();
  const { data: sourceTasks } = useProjectTasks(sourceProjectId);

  // Filter out current project from selection and sort numerically by address
  const availableProjects = (projects?.filter(p => p.id !== currentProjectId) || [])
    .sort((a, b) => {
      // Extract leading numbers from addresses
      const getLeadingNumber = (address: string) => {
        const match = address.match(/^\d+/);
        return match ? parseInt(match[0], 10) : Infinity;
      };
      
      const numA = getLeadingNumber(a.address);
      const numB = getLeadingNumber(b.address);
      
      // If both have numbers, sort by number
      if (numA !== Infinity && numB !== Infinity) {
        return numA - numB;
      }
      
      // If only one has a number, prioritize the numbered one
      if (numA !== Infinity) return -1;
      if (numB !== Infinity) return 1;
      
      // If neither has numbers, sort alphabetically
      return a.address.localeCompare(b.address);
    });

  const handleCopy = async () => {
    if (!sourceProjectId || !projectStartDate) return;
    
    setIsLoading(true);
    try {
      await onCopySchedule({
        sourceProjectId,
        projectStartDate,
        removeAllResources
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
                    {project.address}
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
            <Label htmlFor="copy-resources">Resources</Label>
            <Select value={removeAllResources.toString()} onValueChange={(value) => setRemoveAllResources(value === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Yes, copy all resources</SelectItem>
                <SelectItem value="true">No, don't copy resources</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCopy}
              disabled={!sourceProjectId || !projectStartDate || isLoading}
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