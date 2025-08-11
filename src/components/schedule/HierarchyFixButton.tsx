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
      
      // Generate clean hierarchy numbers
      const fixedTasks = renumberTasks([...tasks]);
      
      // Update each task with its new hierarchy number
      for (const task of fixedTasks) {
        if (task.hierarchy_number) {
          await updateTask.mutateAsync({
            id: task.id,
            hierarchy_number: task.hierarchy_number
          });
        }
      }
      
      toast.success("Hierarchy numbers fixed successfully!");
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