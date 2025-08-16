import React, { useState } from "react";
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
import { Indent, Outdent, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface TaskContextMenuProps {
  children: React.ReactNode;
  task: ProjectTask;
  selectedTasks: Set<string>;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (taskId: string) => void;
  onAddBelow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onBulkDelete: () => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
  canIndent: boolean;
  canOutdent: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onContextMenuChange?: (isOpen: boolean) => void;
}

export function TaskContextMenu({
  children,
  task,
  selectedTasks,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onDelete,
  onBulkDelete,
  onMoveUp,
  onMoveDown,
  canIndent,
  canOutdent,
  canMoveUp,
  canMoveDown,
  onContextMenuChange,
}: TaskContextMenuProps) {
  const isMultipleSelected = (selectedTasks?.size || 0) > 1;
  const isThisTaskSelected = selectedTasks?.has(task.id) || false;
  return (
    <ContextMenu onOpenChange={onContextMenuChange}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => onMoveUp(task.id)}
          disabled={!canMoveUp}
          className="flex items-center gap-2"
        >
          <ArrowUp className="h-4 w-4" />
          Move Up
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => onMoveDown(task.id)}
          disabled={!canMoveDown}
          className="flex items-center gap-2"
        >
          <ArrowDown className="h-4 w-4" />
          Move Down
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
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
        
        <ContextMenuItem
          onClick={() => onAddAbove(task.id)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Above
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem
          onClick={() => {
            if (isMultipleSelected && isThisTaskSelected) {
              onBulkDelete();
            } else {
              onDelete(task.id);
            }
          }}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {isMultipleSelected && isThisTaskSelected 
            ? `Delete Selected (${selectedTasks?.size || 0})` 
            : "Delete"
          }
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}