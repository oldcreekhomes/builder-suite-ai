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

  const handleOutdent = async () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select tasks to outdent");
      return;
    }

    const selectedTaskIds = Array.from(selectedTasks);
    
    try {
      // Build comprehensive hierarchy map for renumbering
      const sortedTasks = [...tasks].sort((a, b) => {
        const aNum = a.hierarchy_number || "999";
        const bNum = b.hierarchy_number || "999";
        return aNum.localeCompare(bNum, undefined, { numeric: true });
      });

      // Group all update operations
      const updateOperations: Array<{ id: string; hierarchy_number: string; parent_id: string | null }> = [];

      // Process each selected task for outdenting
      for (const taskId of selectedTaskIds) {
        const task = tasks.find(t => t.id === taskId);
        if (!task || !task.hierarchy_number) continue;

        const hierarchyParts = task.hierarchy_number.split(".");
        
        // Can't outdent if already at top level
        if (hierarchyParts.length <= 1) continue;

        // Find the current position of this task in sorted order
        const currentIndex = sortedTasks.findIndex(t => t.id === taskId);
        
        // Find where this task should be inserted as a new parent
        // Look for the parent task and insert after it
        const currentParentHierarchy = hierarchyParts.slice(0, -1).join(".");
        const parentTask = tasks.find(t => t.hierarchy_number === currentParentHierarchy);
        
        if (!parentTask) continue;

        // Find the parent's position and determine new parent number
        const parentIndex = sortedTasks.findIndex(t => t.id === parentTask.id);
        
        // Count existing parent-level tasks to determine the new parent number
        const parentLevelTasks = sortedTasks.filter(t => 
          t.hierarchy_number && !t.hierarchy_number.includes(".")
        );
        
        // Find the insertion point: after the current parent
        let newParentNumber = 1;
        for (const parentLevelTask of parentLevelTasks) {
          const parentNum = parseInt(parentLevelTask.hierarchy_number || "0");
          if (parentNum >= newParentNumber && parentLevelTask.id !== taskId) {
            newParentNumber = parentNum + 1;
          }
        }

        // This task becomes a new parent
        updateOperations.push({
          id: taskId,
          hierarchy_number: newParentNumber.toString(),
          parent_id: null
        });

        // Renumber remaining children of the original parent to close the gap
        const originalParentChildren = sortedTasks.filter(t => {
          if (!t.hierarchy_number || t.id === taskId) return false;
          return t.hierarchy_number.startsWith(currentParentHierarchy + ".") && 
                 t.hierarchy_number.split(".").length === hierarchyParts.length;
        });

        // Sort the remaining children and renumber them sequentially
        const sortedChildren = originalParentChildren.sort((a, b) => {
          const aLastPart = parseInt(a.hierarchy_number!.split(".").pop()!);
          const bLastPart = parseInt(b.hierarchy_number!.split(".").pop()!);
          return aLastPart - bLastPart;
        });

        sortedChildren.forEach((child, index) => {
          const newChildHierarchy = currentParentHierarchy + "." + (index + 1);
          updateOperations.push({
            id: child.id,
            hierarchy_number: newChildHierarchy,
            parent_id: parentTask.id
          });

          // Also renumber any descendants of this child
          const childDescendants = sortedTasks.filter(t => 
            t.hierarchy_number && 
            t.hierarchy_number.startsWith(child.hierarchy_number! + ".") &&
            t.id !== child.id
          );

          childDescendants.forEach(descendant => {
            const descendantParts = descendant.hierarchy_number!.split(".");
            const relativeParts = descendantParts.slice(hierarchyParts.length);
            const newDescendantHierarchy = newChildHierarchy + "." + relativeParts.join(".");
            
            // Find the correct parent_id for this descendant
            let descendantParentId = child.id;
            if (relativeParts.length > 1) {
              const descendantParentHierarchy = newChildHierarchy + "." + relativeParts.slice(0, -1).join(".");
              const existingDescendantParent = tasks.find(t => t.hierarchy_number === descendantParentHierarchy);
              const updatedDescendantParent = updateOperations.find(op => op.hierarchy_number === descendantParentHierarchy);
              
              if (existingDescendantParent) {
                descendantParentId = existingDescendantParent.id;
              } else if (updatedDescendantParent) {
                descendantParentId = updatedDescendantParent.id;
              }
            }

            updateOperations.push({
              id: descendant.id,
              hierarchy_number: newDescendantHierarchy,
              parent_id: descendantParentId
            });
          });
        });

        // Now renumber all subsequent parent-level tasks and their children
        const tasksToRenumber = sortedTasks.filter(t => {
          if (!t.hierarchy_number || t.id === taskId) return false;
          
          const isParentLevel = !t.hierarchy_number.includes(".");
          if (isParentLevel) {
            const taskNum = parseInt(t.hierarchy_number);
            return taskNum >= newParentNumber;
          }
          
          // Check if this is a child of a parent that needs renumbering
          const parentHierarchy = t.hierarchy_number.split(".")[0];
          const parentNum = parseInt(parentHierarchy);
          return parentNum >= newParentNumber;
        });

        // Renumber all affected tasks
        for (const taskToRenumber of tasksToRenumber) {
          if (taskToRenumber.id === taskId || 
              updateOperations.some(op => op.id === taskToRenumber.id)) continue; // Skip already processed tasks
          
          const currentHierarchy = taskToRenumber.hierarchy_number!;
          const hierarchyParts = currentHierarchy.split(".");
          const currentParentNum = parseInt(hierarchyParts[0]);
          
          // Increment the parent number
          const newParentNum = currentParentNum + 1;
          hierarchyParts[0] = newParentNum.toString();
          const newHierarchy = hierarchyParts.join(".");
          
          // Find the new parent_id
          let newParentId = null;
          if (hierarchyParts.length > 1) {
            const parentHierarchy = hierarchyParts.slice(0, -1).join(".");
            const existingParentTask = tasks.find(t => t.hierarchy_number === parentHierarchy);
            const updatedParentTask = updateOperations.find(op => op.hierarchy_number === parentHierarchy);
            
            if (existingParentTask) {
              newParentId = existingParentTask.id;
            } else if (updatedParentTask) {
              newParentId = updatedParentTask.id;
            }
          }

          updateOperations.push({
            id: taskToRenumber.id,
            hierarchy_number: newHierarchy,
            parent_id: newParentId
          });
        }
      }

      // Execute all updates in batch
      for (const operation of updateOperations) {
        await updateTask.mutateAsync({
          id: operation.id,
          hierarchy_number: operation.hierarchy_number,
          parent_id: operation.parent_id
        });
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