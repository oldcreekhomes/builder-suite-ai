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
        <Plus className="h-4 w-4" style={{ color: '#ffffff' }} />
        <span className="text-white">Add</span>
      </Button>

      <Button
        onClick={onCopySchedule}
        size="sm"
        className="flex items-center gap-2"
      >
        <Copy className="h-4 w-4 text-white" />
        <span className="text-white">Copy Schedule</span>
      </Button>
      
      <Button
        onClick={onPublish}
        size="sm"
        className="flex items-center gap-2"
      >
        <Send className="h-4 w-4 text-white" />
        <span className="text-white">Publish</span>
      </Button>
    </div>
  );
}