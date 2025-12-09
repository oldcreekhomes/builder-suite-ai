import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Copy, ZoomIn, ZoomOut, ChevronsUpDown, ChevronsDownUp, Undo2, Wrench } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: () => void;
  onPublish: () => void;
  onCopySchedule: () => void;
  allExpanded: boolean;
  onToggleExpandCollapse: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isUndoing?: boolean;
  onRepairSchedule?: () => void;
  isRepairing?: boolean;
  hasCorruptedTasks?: boolean;
}

export function ScheduleToolbar({ 
  selectedTasks, 
  tasks, 
  projectId,
  onAddTask,
  onPublish,
  onCopySchedule,
  allExpanded,
  onToggleExpandCollapse,
  onZoomIn,
  onZoomOut,
  onUndo,
  canUndo,
  isUndoing,
  onRepairSchedule,
  isRepairing,
  hasCorruptedTasks
}: ScheduleToolbarProps) {

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b">
      <Button
        onClick={onAddTask}
        size="sm"
        variant="outline"
      >
        <Plus className="h-4 w-4" />
        <span>Add</span>
      </Button>

      <Button
        onClick={onUndo}
        size="sm"
        variant="outline"
        disabled={!canUndo || isUndoing}
      >
        <Undo2 className="h-4 w-4" />
        <span>Undo</span>
      </Button>

      <Button
        onClick={onCopySchedule}
        size="sm"
        variant="outline"
      >
        <Copy className="h-4 w-4" />
        <span>Copy</span>
      </Button>

      <Button
        onClick={onToggleExpandCollapse}
        size="sm"
        variant="outline"
      >
        {allExpanded ? (
          <ChevronsDownUp className="h-4 w-4" />
        ) : (
          <ChevronsUpDown className="h-4 w-4" />
        )}
      </Button>

      <Button
        onClick={onZoomIn}
        size="sm"
        variant="outline"
      >
        <ZoomIn className="h-4 w-4" />
        <span>Zoom In</span>
      </Button>

      <Button
        onClick={onZoomOut}
        size="sm"
        variant="outline"
      >
        <ZoomOut className="h-4 w-4" />
        <span>Zoom Out</span>
      </Button>

      <Button
        onClick={onPublish}
        size="sm"
        variant="outline"
      >
        <Send className="h-4 w-4" />
        <span>Publish</span>
      </Button>

      {hasCorruptedTasks && onRepairSchedule && (
        <Button
          onClick={onRepairSchedule}
          size="sm"
          variant="destructive"
          disabled={isRepairing}
        >
          <Wrench className="h-4 w-4" />
          <span>{isRepairing ? 'Repairing...' : 'Repair Schedule'}</span>
        </Button>
      )}
    </div>
  );
}
