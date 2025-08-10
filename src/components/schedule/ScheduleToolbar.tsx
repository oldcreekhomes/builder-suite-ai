import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Indent, Outdent, Send } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { toast } from "sonner";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  onAddTask: () => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
  onPublish: () => void;
}

export function ScheduleToolbar({ 
  selectedTasks, 
  tasks, 
  onAddTask, 
  onTaskUpdate, 
  onPublish 
}: ScheduleToolbarProps) {
  
  const handleIndent = () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select tasks to indent");
      return;
    }

    const selectedTaskIds = Array.from(selectedTasks);
    
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Find the task above this one in the hierarchy
      const sortedTasks = [...tasks].sort((a, b) => {
        const aNum = a.hierarchy_number || "999";
        const bNum = b.hierarchy_number || "999";
        return aNum.localeCompare(bNum, undefined, { numeric: true });
      });

      const currentIndex = sortedTasks.findIndex(t => t.id === taskId);
      if (currentIndex > 0) {
        const parentTask = sortedTasks[currentIndex - 1];
        onTaskUpdate(taskId, { parent_id: parentTask.id });
      }
    });

    toast.success("Tasks indented successfully");
  };

  const handleOutdent = () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select tasks to outdent");
      return;
    }

    const selectedTaskIds = Array.from(selectedTasks);
    
    selectedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.hierarchy_number) return;

      const hierarchyParts = task.hierarchy_number.split(".");
      
      // Can't outdent if already at top level
      if (hierarchyParts.length <= 1) return;

      // Remove the last part to move up one level
      const newHierarchy = hierarchyParts.slice(0, -1).join(".");
      
      // Update both parent_id and hierarchy_number
      const parentTask = tasks.find(t => t.hierarchy_number === newHierarchy);
      const grandparentId = parentTask?.parent_id || null;
      
      onTaskUpdate(taskId, { 
        parent_id: grandparentId,
        hierarchy_number: newHierarchy 
      });
    });

    toast.success("Tasks outdented successfully");
  };

  const canIndent = selectedTasks.size > 0;
  const canOutdent = selectedTasks.size > 0 && 
    Array.from(selectedTasks).some(taskId => {
      const task = tasks.find(t => t.id === taskId);
      return task?.hierarchy_number && task.hierarchy_number.split(".").length > 1;
    });

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
      
      <Button
        onClick={handleIndent}
        disabled={!canIndent}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        <Indent className="h-4 w-4" />
        Indent
      </Button>
      
      <Button
        onClick={handleOutdent}
        disabled={!canOutdent}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        <Outdent className="h-4 w-4" />
        Outdent
      </Button>
      
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