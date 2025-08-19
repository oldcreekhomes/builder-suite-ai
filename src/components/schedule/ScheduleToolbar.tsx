import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Copy, ZoomIn, ZoomOut } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: () => void;
  onPublish: () => void;
  onCopySchedule: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ScheduleToolbar({ 
  selectedTasks, 
  tasks, 
  projectId,
  onAddTask,
  onPublish,
  onCopySchedule,
  onZoomIn,
  onZoomOut
}: ScheduleToolbarProps) {

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b">
      <Button
        onClick={onAddTask}
        size="sm"
        className="flex items-center gap-2"
      >
        <Plus style={{ color: '#ffffff', fill: '#ffffff', stroke: '#ffffff' }} />
        <span style={{ color: '#ffffff' }}>Add</span>
      </Button>

      <Button
        onClick={onCopySchedule}
        size="sm"
        className="flex items-center gap-2"
      >
        <Copy style={{ color: '#ffffff', fill: '#ffffff', stroke: '#ffffff' }} />
        <span style={{ color: '#ffffff' }}>Copy Schedule</span>
      </Button>

      <Button
        onClick={onPublish}
        size="sm"
        className="flex items-center gap-2"
      >
        <Send style={{ color: '#ffffff', fill: '#ffffff', stroke: '#ffffff' }} />
        <span style={{ color: '#ffffff' }}>Publish</span>
      </Button>

      <div className="flex items-center gap-1 ml-4">
        <Button
          onClick={onZoomOut}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <ZoomOut className="h-4 w-4" />
          <span>Zoom Out</span>
        </Button>

        <Button
          onClick={onZoomIn}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <ZoomIn className="h-4 w-4" />
          <span>Zoom In</span>
        </Button>
      </div>
    </div>
  );
}