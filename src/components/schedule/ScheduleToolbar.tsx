import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Indent, Outdent, Send } from "lucide-react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { toast } from "sonner";
import { useTaskMutations } from "@/hooks/useTaskMutations";

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

    const selectedTaskIds = Array.from(selectedTasks);
    
    try {
      for (const taskId of selectedTaskIds) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) continue;

        // Check if task is already at maximum indent level (we'll limit to 2 levels deep: X.Y)
        if (task.hierarchy_number && task.hierarchy_number.split(".").length >= 2) {
          toast.error("Cannot indent further - task is already at maximum depth");
          return;
        }

        // Find potential parent task (the last task before this one that can be a parent)
        const sortedTasks = [...tasks].sort((a, b) => {
          const aNum = a.hierarchy_number || "999";
          const bNum = b.hierarchy_number || "999";
          return aNum.localeCompare(bNum, undefined, { numeric: true });
        });

        const currentIndex = sortedTasks.findIndex(t => t.id === taskId);
        let parentTask = null;
        
        // Look backwards to find a suitable parent (a task that's one level up)
        for (let i = currentIndex - 1; i >= 0; i--) {
          const potentialParent = sortedTasks[i];
          const potentialParentLevel = potentialParent.hierarchy_number ? 
            potentialParent.hierarchy_number.split(".").length : 1;
          const currentLevel = task.hierarchy_number ? 
            task.hierarchy_number.split(".").length : 1;
          
          // Found a potential parent at the same level or one level up
          if (potentialParentLevel === currentLevel) {
            parentTask = potentialParent;
            break;
          }
        }
        
        if (!parentTask) {
          toast.error("No suitable parent task found for indenting");
          return;
        }
        
        // Find existing children of the parent to determine the next child number
        const existingChildren = sortedTasks.filter(t => 
          t.hierarchy_number && 
          t.hierarchy_number.startsWith(parentTask.hierarchy_number + ".") &&
          t.hierarchy_number.split(".").length === (parentTask.hierarchy_number?.split(".").length || 0) + 1
        );
        
        // Calculate the next child number
        let nextChildNumber = 1;
        if (existingChildren.length > 0) {
          const childNumbers = existingChildren.map(child => {
            const parts = child.hierarchy_number!.split(".");
            return parseInt(parts[parts.length - 1]);
          });
          nextChildNumber = Math.max(...childNumbers) + 1;
        }
        
        const newHierarchyNumber = parentTask.hierarchy_number + "." + nextChildNumber;
        
        await updateTask.mutateAsync({
          id: taskId,
          parent_id: parentTask.id,
          hierarchy_number: newHierarchyNumber
        });
      }

      toast.success("Tasks indented successfully");
    } catch (error) {
      console.error("Error indenting tasks:", error);
      toast.error("Failed to indent tasks");
    }
  };

  const handleOutdent = async () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select tasks to outdent");
      return;
    }

    const selectedTaskIds = Array.from(selectedTasks);
    
    try {
      for (const taskId of selectedTaskIds) {
        const task = tasks.find(t => t.id === taskId);
        if (!task || !task.hierarchy_number) continue;

        const hierarchyParts = task.hierarchy_number.split(".");
        
        // Can't outdent if already at top level (only one part in hierarchy)
        if (hierarchyParts.length <= 1) {
          toast.error("Cannot outdent further - task is already at top level");
          return;
        }

        // Only allow outdenting one level at a time
        if (hierarchyParts.length > 2) {
          // Move from X.Y.Z to X.Y (remove one level)
          const newHierarchyNumber = hierarchyParts.slice(0, -1).join(".");
          const newParentHierarchy = hierarchyParts.slice(0, -2).join(".");
          
          // Find the new parent task
          const newParentTask = tasks.find(t => t.hierarchy_number === newParentHierarchy);
          
          await updateTask.mutateAsync({
            id: taskId,
            hierarchy_number: newHierarchyNumber,
            parent_id: newParentTask ? newParentTask.id : null
          });
        } else {
          // Move from X.Y to top level (become a new parent)
          // Find the highest parent-level number and add 1
          const parentLevelTasks = tasks.filter(t => 
            t.hierarchy_number && !t.hierarchy_number.includes(".")
          );
          
          let newParentNumber = 1;
          if (parentLevelTasks.length > 0) {
            const parentNumbers = parentLevelTasks.map(t => parseInt(t.hierarchy_number!));
            newParentNumber = Math.max(...parentNumbers) + 1;
          }

          await updateTask.mutateAsync({
            id: taskId,
            hierarchy_number: newParentNumber.toString(),
            parent_id: null
          });
        }
      }

      toast.success("Tasks outdented successfully");
    } catch (error) {
      console.error("Error outdenting tasks:", error);
      toast.error("Failed to outdent tasks");
    }
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