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
  
  // DISABLED: Indent/Outdent functionality during refactoring
  const handleIndent = async () => {
    toast.info("Indent functionality temporarily disabled during refactoring");
  };

  const handleOutdent = async () => {
    toast.info("Outdent functionality temporarily disabled during refactoring");
  };

  // DISABLED: Button state logic during refactoring
  const canIndentTasks = false; // Disabled during refactoring
  const canOutdentTasks = false; // Disabled during refactoring

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
        
        {/* DISABLED: HierarchyFixButton during refactoring */}
        {/* <HierarchyFixButton tasks={tasks} projectId={projectId} /> */}
      
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