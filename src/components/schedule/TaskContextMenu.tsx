import React from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { Indent, Outdent, Plus, StickyNote } from "lucide-react";

interface TaskContextMenuProps {
  children: React.ReactNode;
  task: ProjectTask;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (taskId: string) => void;
  onAddBelow: (taskId: string) => void;
  onOpenNotes: (taskId: string) => void;
  canIndent: boolean;
  canOutdent: boolean;
  onContextMenuChange?: (isOpen: boolean) => void;
}

export function TaskContextMenu({
  children,
  task,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onOpenNotes,
  canIndent,
  canOutdent,
  onContextMenuChange,
}: TaskContextMenuProps) {
  return (
    <ContextMenu onOpenChange={onContextMenuChange}>
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
            Add Task
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36">
            <ContextMenuItem 
              onClick={() => onAddAbove(task.id)} 
              className="flex items-center gap-2"
            >
              Add Above
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onAddBelow(task.id)} 
              className="flex items-center gap-2"
            >
              Add Below
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuItem
          onClick={() => onOpenNotes(task.id)}
          className="flex items-center gap-2"
        >
          <StickyNote className="h-4 w-4" />
          Notes
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}