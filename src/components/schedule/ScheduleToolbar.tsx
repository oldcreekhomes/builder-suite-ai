import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Copy, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: () => void;
  onPublish: () => void;
  onCopySchedule: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
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
  onExpandAll,
  onCollapseAll,
  onZoomIn,
  onZoomOut
}: ScheduleToolbarProps) {

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b">
      <Button
        onClick={onAddTask}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <Plus className="h-4 w-4 text-white" />
        <span className="text-white">Add</span>
      </Button>

      <Button
        onClick={onCopySchedule}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <Copy className="h-4 w-4 text-white" />
        <span className="text-white">Copy</span>
      </Button>

      <Button
        onClick={onExpandAll}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <ChevronDown className="h-4 w-4 text-white" />
        <span className="text-white">Expand All</span>
      </Button>

      <Button
        onClick={onCollapseAll}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <ChevronUp className="h-4 w-4 text-white" />
        <span className="text-white">Collapse All</span>
      </Button>

      <Button
        onClick={onZoomIn}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <ZoomIn className="h-4 w-4 text-white" />
        <span className="text-white">Zoom In</span>
      </Button>

      <Button
        onClick={onZoomOut}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <ZoomOut className="h-4 w-4 text-white" />
        <span className="text-white">Zoom Out</span>
      </Button>

      <Button
        onClick={onPublish}
        size="sm"
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        <Send className="h-4 w-4 text-white" />
        <span className="text-white">Publish</span>
      </Button>
    </div>
  );
}