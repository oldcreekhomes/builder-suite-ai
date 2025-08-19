import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TaskContextMenu } from "./TaskContextMenu";
import { InlineEditCell } from "./InlineEditCell";
import { ResourcesSelector } from "./ResourcesSelector";
import { ProgressSelector } from "./ProgressSelector";
import { calculateParentTaskValues, shouldUpdateParentTask, calculateTaskDatesFromPredecessors } from "@/utils/taskCalculations";
import { calculateBusinessEndDate, formatDisplayDate, DateString } from "@/utils/dateOnly";
import { PredecessorSelector } from "./PredecessorSelector";

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
    try {
      // Handle invalid or empty date strings
      if (!dateString || dateString === 'Invalid Date' || dateString === 'null' || dateString === 'undefined') {
        return "—";
      }
      
      // Convert to string if not already
      const dateStr = String(dateString);
      
      // Extract date part and validate format
      const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      if (!datePart || datePart.length < 8) { // Minimum YYYY-MM-DD is 10, but be more lenient
        console.warn('Invalid date format:', dateString);
        return "—";
      }
      
      // Additional validation - check if it looks like a date
      const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
      if (!dateRegex.test(datePart)) {
        console.warn('Date does not match expected format:', dateString);
        return "—";
      }
      
      // Create date and validate BEFORE calling format
      const date = new Date(datePart + "T12:00:00");
      const timestamp = date.getTime();
      
      if (isNaN(timestamp) || timestamp < 0) {
        console.warn('Invalid date timestamp:', dateString, timestamp);
        return "—";
      }
      
      // Additional sanity check - ensure year is reasonable
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        console.warn('Date year out of reasonable range:', dateString, year);
        return "—";
      }
      
      return format(date, "MM/dd/yy");
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return "—";
    }
  };

  const getIndentLevel = (hierarchyNumber: string) => {
    const parts = hierarchyNumber.split(".");
    return Math.max(0, parts.length - 1);
  };

  const indentLevel = task.hierarchy_number ? getIndentLevel(task.hierarchy_number) : 0;

  const calculateEndDate = (startDate: string, duration: number) => {
    try {
      // Validate inputs
      if (!startDate || !duration || duration < 0) {
        console.warn('Invalid inputs for calculateEndDate:', { startDate, duration });
        return new Date().toISOString().split('T')[0] + 'T00:00:00'; // Return today as fallback
      }
      
      // Parse date locally (no timezone conversion) - handle both formats
      const normalizedStart = startDate.includes('T') ? startDate.split('T')[0] : startDate;
      
      // Validate date format (YYYY-MM-DD)
      if (!normalizedStart || normalizedStart.length < 10) {
        console.warn('Invalid start date format:', startDate);
        return new Date().toISOString().split('T')[0] + 'T00:00:00';
      }
      
      const start = new Date(normalizedStart + 'T00:00:00');
      
      // Validate the parsed date
      if (isNaN(start.getTime())) {
        console.warn('Invalid start date:', startDate);
        return new Date().toISOString().split('T')[0] + 'T00:00:00';
      }
      
      const endDateStr = calculateBusinessEndDate(normalizedStart, duration);
      
      return endDateStr + 'T00:00:00';
    } catch (error) {
      console.error('Error in calculateEndDate:', error, { startDate, duration });
      return new Date().toISOString().split('T')[0] + 'T00:00:00';
    }
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
        updates.start_date = dateUpdate.startDate + 'T00:00:00';
        updates.end_date = dateUpdate.endDate + 'T00:00:00';
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

  // Check if this is an optimistic (unsaved) task
  const isOptimistic = task.id.startsWith('optimistic-');

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
            <div className="flex-1 flex items-center">
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
            value={(() => {
              try {
                if (!task.start_date) return "";
                const datePart = task.start_date.split("T")[0];
                // Validate the date part before using it
                const testDate = new Date(datePart + "T12:00:00");
                if (isNaN(testDate.getTime())) {
                  console.warn('Invalid start_date for task:', task.task_name, task.start_date);
                  return "";
                }
                return datePart;
              } catch (error) {
                console.error('Error processing start_date:', task.start_date, error);
                return "";
              }
            })()}
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
            {(() => {
              try {
                if (!task.start_date || !task.duration) return "—";
                const endDate = calculateEndDate(task.start_date, task.duration);
                return formatDate(endDate);
              } catch (error) {
                console.error('Error calculating/formatting end date:', error);
                return "—";
              }
            })()}
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
          <ProgressSelector
            value={task.progress || 0}
            onSave={handleFieldUpdate("progress")}
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