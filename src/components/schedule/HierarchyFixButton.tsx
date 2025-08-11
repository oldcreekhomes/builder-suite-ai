import React from "react";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { renumberTasks } from "@/utils/hierarchyUtils";

interface HierarchyFixButtonProps {
  tasks: ProjectTask[];
  projectId: string;
}

export function HierarchyFixButton({ tasks, projectId }: HierarchyFixButtonProps) {
  const { updateTask } = useTaskMutations(projectId);

  const handleFixHierarchy = async () => {
    if (tasks.length === 0) {
      toast.error("No tasks to fix");
      return;
    }

    try {
      toast.info("Fixing hierarchy numbers...");
      
      // Get all construction tasks (those with "3.1" hierarchy)
      const constructionTasks = tasks.filter(task => task.hierarchy_number === "3.1");
      
      if (constructionTasks.length === 0) {
        toast.success("No tasks need fixing!");
        return;
      }
      
      // Sort by task name to maintain consistent order
      constructionTasks.sort((a, b) => a.task_name.localeCompare(b.task_name));
      
      // Update each task with sequential numbering
      for (let i = 0; i < constructionTasks.length; i++) {
        const task = constructionTasks[i];
        const newHierarchyNumber = `2.${i + 1}`;
        
        await updateTask.mutateAsync({
          id: task.id,
          hierarchy_number: newHierarchyNumber
        });
      }
      
      toast.success(`Fixed ${constructionTasks.length} construction tasks!`);
    } catch (error) {
      console.error("Failed to fix hierarchy:", error);
      toast.error("Failed to fix hierarchy numbers");
    }
  };

  return (
    <Button
      onClick={handleFixHierarchy}
      size="sm"
      variant="outline"
      className="flex items-center gap-2"
      title="Fix and clean up all hierarchy numbers"
    >
      <Wrench className="h-4 w-4" />
      Fix Hierarchy
    </Button>
  );
}