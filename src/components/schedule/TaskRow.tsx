import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TaskContextMenu } from "./TaskContextMenu";
import { InlineEditCell } from "./InlineEditCell";
import { ResourcesSelector } from "./ResourcesSelector";
import { PredecessorSelector } from "./PredecessorSelector";
import { calculateParentTaskValues, shouldUpdateParentTask, calculateTaskDatesFromPredecessors } from "@/utils/taskCalculations";
import { calculateBusinessEndDate } from "@/utils/businessDays";

interface TaskRowProps {
  task: ProjectTask;
  allTasks: ProjectTask[];
  index: number;
  onTaskUpdate: (taskId: string, updates: any) => void;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
  isSelected: boolean;
  onTaskSelection: (taskId: string, checked: boolean) => void;
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
}

export function TaskRow({
  task,
  allTasks,
  index,
  onTaskUpdate,
  hasChildren,
  isExpanded,
  onToggleExpand,
  isSelected,
  onTaskSelection,
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
  canMoveDown
}: TaskRowProps) {
  const formatDate = (dateString: string) => {
    // Avoid timezone conversion by adding T12:00:00 to the date string
    return format(new Date(dateString + "T12:00:00"), "MM/dd/yy");
  };

  const getIndentLevel = (hierarchyNumber: string) => {
    const parts = hierarchyNumber.split(".");
    return Math.max(0, parts.length - 1);
  };

  const indentLevel = task.hierarchy_number ? getIndentLevel(task.hierarchy_number) : 0;

  const calculateEndDate = (startDate: string, duration: number) => {
    const start = new Date(startDate);
    const end = calculateBusinessEndDate(start, duration);
    return end.toISOString().split('T')[0];
  };

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const handleFieldUpdate = (field: string) => (value: string | number | string[]) => {
    const updates: any = { [field]: value };
    
    // Special handling for predecessor changes
    if (field === "predecessor") {
      // Calculate new dates based on predecessors
      const tempTask = { ...task, predecessor: value as string | string[] };
      const dateUpdate = calculateTaskDatesFromPredecessors(tempTask, allTasks);
      
      if (dateUpdate) {
        updates.start_date = dateUpdate.startDate;
        updates.end_date = dateUpdate.endDate;
        updates.duration = dateUpdate.duration;
      }
    }
    // Auto-calculate end date when start date or duration changes (for non-parent tasks)
    else if (!hasChildren) {
      if (field === "start_date") {
        updates.end_date = calculateEndDate(value as string, task.duration);
      } else if (field === "duration") {
        updates.end_date = calculateEndDate(task.start_date, value as number);
      }
    }
    
    onTaskUpdate(task.id, updates);
  };

  // Parse predecessors for display
  const getPredecessorArray = (): string[] => {
    if (!task.predecessor) return [];
    if (Array.isArray(task.predecessor)) return task.predecessor;
    try {
      return JSON.parse(task.predecessor as string);
    } catch {
      return task.predecessor ? [task.predecessor] : [];
    }
  };

  return (
    <TaskContextMenu
      task={task}
      selectedTasks={selectedTasks}
      onIndent={onIndent}
      onOutdent={onOutdent}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
      onDelete={onDelete}
      onBulkDelete={onBulkDelete}
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
            readOnly={hasChildren}
          />
        </TableCell>

        {/* Duration */}
        <TableCell className="py-1 px-2">
          <InlineEditCell
            value={task.duration}
            type="number"
            onSave={handleFieldUpdate("duration")}
            displayFormat={(value) => `${value}d`}
            readOnly={hasChildren}
          />
        </TableCell>

        {/* End Date - Read Only for all tasks */}
        <TableCell className="py-1 px-2">
          <span className="text-xs px-1 py-0.5 text-black">
            {formatDate(calculateEndDate(task.start_date, task.duration))}
          </span>
        </TableCell>

        {/* Predecessors */}
        <TableCell className="py-1 px-2 w-24">
          <PredecessorSelector
            value={getPredecessorArray()}
            onValueChange={handleFieldUpdate('predecessor')}
            currentTaskId={task.id}
            allTasks={allTasks}
            className="w-full"
          />
        </TableCell>

        {/* Progress */}
        <TableCell className="py-1 px-2">
          <InlineEditCell
            value={task.progress || 0}
            type="number"
            onSave={handleFieldUpdate("progress")}
            displayFormat={(value) => `${value}%`}
            readOnly={hasChildren}
          />
        </TableCell>

        {/* Resources */}
        <TableCell className="py-1 px-2">
          <ResourcesSelector
            value={task.resources || ""}
            onValueChange={(value) => handleFieldUpdate("resources")(value)}
            readOnly={hasChildren}
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