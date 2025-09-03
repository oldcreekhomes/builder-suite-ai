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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Indent, Outdent, Plus, Trash2, ArrowUp, ArrowDown, StickyNote } from "lucide-react";

interface TaskContextMenuProps {
  children: React.ReactNode;
  task: ProjectTask;
  selectedTasks: Set<string>;
  allTasks: ProjectTask[]; // Need all tasks to check for children
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (taskId: string) => void;
  onAddBelow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onBulkDelete: () => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
  onOpenNotes: (taskId: string) => void;
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
  allTasks,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onDelete,
  onBulkDelete,
  onMoveUp,
  onMoveDown,
  onOpenNotes,
  canIndent,
  canOutdent,
  canMoveUp,
  canMoveDown,
  onContextMenuChange,
}: TaskContextMenuProps) {
  const isMultipleSelected = (selectedTasks?.size || 0) > 1;
  const isThisTaskSelected = selectedTasks?.has(task.id) || false;
  
  // Helper function to check if a task has children
  const hasChildren = (taskToCheck: ProjectTask) => {
    if (!taskToCheck?.hierarchy_number || !allTasks) return false;
    return allTasks.some(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(taskToCheck.hierarchy_number + ".") &&
      t.hierarchy_number.split(".").length === taskToCheck.hierarchy_number.split(".").length + 1
    );
  };

  const taskHasChildren = hasChildren(task);
  const canDeleteTask = !taskHasChildren;
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
        
        <ContextMenuItem
          onClick={() => onOpenNotes(task.id)}
          className="flex items-center gap-2"
        >
          <StickyNote className="h-4 w-4" />
          Notes
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <ContextMenuItem
                onClick={() => {
                  if (!canDeleteTask) return; // Prevent action if disabled
                  if (isMultipleSelected && isThisTaskSelected) {
                    onBulkDelete();
                  } else {
                    onDelete(task.id);
                  }
                }}
                disabled={!canDeleteTask}
                className="flex items-center gap-2 text-destructive focus:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                {isMultipleSelected && isThisTaskSelected 
                  ? `Delete Selected (${selectedTasks?.size || 0})` 
                  : "Delete"
                }
              </ContextMenuItem>
            </TooltipTrigger>
            {!canDeleteTask && (
              <TooltipContent>
                <p>Delete all child tasks first</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </ContextMenuContent>
    </ContextMenu>
  );
}