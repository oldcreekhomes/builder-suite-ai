import React from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Indent, Outdent, Plus, Trash2 } from "lucide-react";

interface TaskContextMenuProps {
  children: React.ReactNode;
  task: ProjectTask;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (taskId: string) => void;
  onAddBelow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  canIndent: boolean;
  canOutdent: boolean;
}

export function TaskContextMenu({
  children,
  task,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onDelete,
  canIndent,
  canOutdent,
}: TaskContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => onIndent(task.id)}
          disabled={!canIndent}
          className="flex items-center gap-2"
        >
          <Indent className="h-4 w-4" />
          Indent
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => onOutdent(task.id)}
          disabled={!canOutdent}
          className="flex items-center gap-2"
        >
          <Outdent className="h-4 w-4" />
          Outdent
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-32">
            <ContextMenuItem
              onClick={() => onAddAbove(task.id)}
              className="flex items-center gap-2"
            >
              Above
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onAddBelow(task.id)}
              className="flex items-center gap-2"
            >
              Below
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem
          onClick={() => onDelete(task.id)}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}