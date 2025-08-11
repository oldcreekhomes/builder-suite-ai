import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TaskContextMenu } from "./TaskContextMenu";
import { InlineEditCell } from "./InlineEditCell";

interface TaskRowProps {
  task: ProjectTask;
  index: number;
  onTaskUpdate: (taskId: string, updates: any) => void;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
  isSelected: boolean;
  onTaskSelection: (taskId: string, checked: boolean) => void;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (taskId: string) => void;
  onAddBelow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
  canIndent: boolean;
  canOutdent: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function TaskRow({
  task,
  index,
  onTaskUpdate,
  hasChildren,
  isExpanded,
  onToggleExpand,
  isSelected,
  onTaskSelection,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onDelete,
  onMoveUp,
  onMoveDown,
  canIndent,
  canOutdent,
  canMoveUp,
  canMoveDown
}: TaskRowProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MM/dd/yy");
  };

  const getIndentLevel = (hierarchyNumber: string) => {
    const parts = hierarchyNumber.split(".");
    return Math.max(0, parts.length - 1);
  };

  const indentLevel = task.hierarchy_number ? getIndentLevel(task.hierarchy_number) : 0;

  const calculateEndDate = (startDate: string, duration: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration); // Duration is additional days from start
    return end.toISOString().split('T')[0];
  };

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const handleFieldUpdate = (field: string) => (value: string | number) => {
    const updates: any = { [field]: value };
    
    // Auto-calculate end date when start date or duration changes
    if (field === "start_date") {
      updates.end_date = calculateEndDate(value as string, task.duration);
    } else if (field === "duration") {
      updates.end_date = calculateEndDate(task.start_date, value as number);
    }
    
    onTaskUpdate(task.id, updates);
  };

  return (
    <TaskContextMenu
      task={task}
      onIndent={onIndent}
      onOutdent={onOutdent}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
      onDelete={onDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      canIndent={canIndent}
      canOutdent={canOutdent}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onContextMenuChange={setIsContextMenuOpen}
    >
      <TableRow className={`h-8 hover:bg-muted/50 ${isContextMenuOpen ? 'bg-primary/10' : ''}`}>
        {/* Selection Checkbox */}
        <TableCell className="py-1 px-2 w-10">
          <div
            className={`h-3 w-3 border border-border rounded-sm cursor-pointer ${
              isSelected ? 'bg-black' : 'bg-white'
            }`}
            onClick={() => onTaskSelection(task.id, !isSelected)}
          />
        </TableCell>

        {/* Hierarchy Number */}
        <TableCell className="text-xs py-1 px-1 w-16">
          <div className="flex items-center">
            <span className="text-xs">{task.hierarchy_number || "—"}</span>
          </div>
        </TableCell>

        {/* Task Name with Indentation */}
        <TableCell className="py-1 pl-2 pr-2 w-48">
          <div className="flex items-center">
            {/* Indentation spacer - only for child tasks (level > 0) */}
            {indentLevel > 0 && <div style={{ width: `${indentLevel * 16}px` }} />}
            
            {/* Fixed-width space for expand/collapse button - ensures alignment */}
            <div className="w-4 flex-shrink-0 mr-1 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={() => onToggleExpand(task.id)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              ) : null}
            </div>
            
            {/* Task name aligned with column header */}
            <div className="flex-1">
              <InlineEditCell
                value={task.task_name}
                type="text"
                onSave={handleFieldUpdate("task_name")}
                className="truncate text-left"
              />
            </div>
          </div>
        </TableCell>

        {/* Start Date */}
        <TableCell className="py-1 px-2">
          <InlineEditCell
            value={task.start_date.split("T")[0]}
            type="date"
            onSave={handleFieldUpdate("start_date")}
            displayFormat={formatDate}
          />
        </TableCell>

        {/* Duration */}
        <TableCell className="py-1 px-2">
          <InlineEditCell
            value={task.duration}
            type="number"
            onSave={handleFieldUpdate("duration")}
            displayFormat={(value) => `${value}d`}
          />
        </TableCell>

        {/* End Date - Read Only */}
        <TableCell className="py-1 px-2">
          <span className="text-xs px-1 py-0.5 text-muted-foreground">
            {formatDate(calculateEndDate(task.start_date, task.duration))}
          </span>
        </TableCell>

        {/* Progress */}
        <TableCell className="py-1 px-2">
          <InlineEditCell
            value={task.progress || 0}
            type="number"
            onSave={handleFieldUpdate("progress")}
            displayFormat={(value) => `${value}%`}
          />
        </TableCell>

        {/* Resources */}
        <TableCell className="py-1 px-2">
          <InlineEditCell
            value={task.resources || ""}
            type="text"
            onSave={handleFieldUpdate("resources")}
            displayFormat={(value) => value || "—"}
          />
        </TableCell>

        {/* Actions */}
        <TableCell className="py-1 px-2">
          {/* Empty cell - actions now handled by context menu */}
        </TableCell>
      </TableRow>
    </TaskContextMenu>
  );
}