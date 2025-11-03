import React from "react";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { renumberTasks } from "@/utils/hierarchyUtils";

interface HierarchyFixButtonProps {
  tasks: ProjectTask[];
  projectId: string;
}

export function HierarchyFixButton({ tasks, projectId }: HierarchyFixButtonProps) {
  const { updateTask } = useTaskMutations(projectId);
  const { toast } = useToast();

  const handleFixHierarchy = async () => {
    if (tasks.length === 0) {
      toast({ title: "Error", description: "No tasks to fix", variant: "destructive" });
      return;
    }

    try {
      toast({ title: "Info", description: "Fixing hierarchy numbers..." });
      
      // Get all construction tasks (those with "3.1" hierarchy)
      const constructionTasks = tasks.filter(task => task.hierarchy_number === "3.1");
      
      if (constructionTasks.length === 0) {
        toast({ title: "Success", description: "No tasks need fixing!" });
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
      
      toast({ title: "Success", description: `Fixed ${constructionTasks.length} construction tasks!` });
    } catch (error) {
      console.error("Failed to fix hierarchy:", error);
      toast({ title: "Error", description: "Failed to fix hierarchy numbers", variant: "destructive" });
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