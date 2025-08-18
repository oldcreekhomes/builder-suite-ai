import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Copy } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: () => void;
  onPublish: () => void;
  onCopySchedule: () => void;
}

export function ScheduleToolbar({ 
  selectedTasks, 
  tasks, 
  projectId,
  onAddTask,
  onPublish,
  onCopySchedule
}: ScheduleToolbarProps) {

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b">
      <Button
        onClick={onAddTask}
        size="sm"
        className="flex items-center gap-2"
      >
        <Plus style={{ color: '#000000', fill: '#000000', stroke: '#000000' }} />
        <span style={{ color: '#000000' }}>Add</span>
      </Button>

      <Button
        onClick={onCopySchedule}
        size="sm"
        className="flex items-center gap-2"
      >
        <Copy style={{ color: '#000000', fill: '#000000', stroke: '#000000' }} />
        <span style={{ color: '#000000' }}>Copy Schedule</span>
      </Button>
      
      <Button
        onClick={onPublish}
        size="sm"
        className="flex items-center gap-2"
      >
        <Send style={{ color: '#000000', fill: '#000000', stroke: '#000000' }} />
        <span style={{ color: '#000000' }}>Publish</span>
      </Button>
    </div>
  );
}