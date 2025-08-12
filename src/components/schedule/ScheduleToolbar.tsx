import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Trash2 } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: () => void;
  onBulkDelete: () => void;
  onPublish: () => void;
}

export function ScheduleToolbar({ 
  selectedTasks, 
  tasks, 
  projectId,
  onAddTask,
  onBulkDelete,
  onPublish 
}: ScheduleToolbarProps) {

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b">
      <Button
        onClick={onAddTask}
        size="sm"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add
      </Button>
      
      {selectedTasks.size > 0 && (
        <Button
          onClick={onBulkDelete}
          size="sm"
          variant="destructive"
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete ({selectedTasks.size})
        </Button>
      )}
      
      <div className="ml-auto">
        <Button
          onClick={onPublish}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Publish
        </Button>
      </div>
    </div>
  );
}