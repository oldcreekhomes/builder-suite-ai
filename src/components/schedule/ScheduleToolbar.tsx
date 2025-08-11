import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Indent, Outdent, Send } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { toast } from "sonner";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { 
  canIndent, 
  canOutdent, 
  generateIndentHierarchy, 
  generateOutdentHierarchy 
} from "@/utils/hierarchyUtils";
import { HierarchyFixButton } from "./HierarchyFixButton";

interface ScheduleToolbarProps {
  selectedTasks: Set<string>;
  tasks: ProjectTask[];
  projectId: string;
  onAddTask: () => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
  onPublish: () => void;
}

export function ScheduleToolbar({ 
  selectedTasks, 
  tasks, 
  projectId,
  onAddTask, 
  onTaskUpdate, 
  onPublish 
}: ScheduleToolbarProps) {
  const { updateTask } = useTaskMutations(projectId);
  
  const handleIndent = async () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select tasks to indent");
      return;
    }

    for (const taskId of selectedTasks) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) continue;
      
      const newHierarchy = generateIndentHierarchy(task, tasks);
      if (!newHierarchy) {
        toast.error(`Cannot indent task: ${task.task_name}`);
        continue;
      }
      
      try {
        await updateTask.mutateAsync({
          id: taskId,
          hierarchy_number: newHierarchy
        });
      } catch (error) {
        toast.error(`Failed to indent task: ${task.task_name}`);
        console.error("Error indenting task:", error);
      }
    }
    
    toast.success("Tasks indented successfully");
  };

  const handleOutdent = async () => {
    toast.info("Outdent functionality temporarily disabled during refactoring");
  };

  // Check if any selected tasks can be indented
  const canIndentTasks = selectedTasks.size > 0 && 
    Array.from(selectedTasks).some(taskId => {
      const task = tasks.find(t => t.id === taskId);
      return task && canIndent(task, tasks);
    });

  const canOutdentTasks = false; // Keep outdent disabled for now

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
        disabled={!canIndentTasks}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        <Indent className="h-4 w-4" />
        Indent
      </Button>
      
        <Button
          onClick={handleOutdent}
          disabled={!canOutdentTasks}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <Outdent className="h-4 w-4" />
          Outdent
        </Button>
        
        <HierarchyFixButton tasks={tasks} projectId={projectId} />
      
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