import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronDown, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { TaskContextMenu } from "./TaskContextMenu";
import { TaskNotesDialog } from "./TaskNotesDialog";
import { InlineEditCell } from "./InlineEditCell";
import { ResourcesSelector } from "./ResourcesSelector";
import { ProgressSelector } from "./ProgressSelector";
import { calculateParentTaskValues, shouldUpdateParentTask, calculateTaskDatesFromPredecessors } from "@/utils/taskCalculations";
import { calculateBusinessEndDate, formatDisplayDate, DateString } from "@/utils/dateOnly";
import { PredecessorSelector } from "./PredecessorSelector";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { safeParsePredecessors } from "@/utils/predecessorValidation";

interface TaskRowProps {
  task: ProjectTask;
  allTasks: ProjectTask[];
  index: number;
  onTaskUpdate: (taskId: string, updates: any, options?: { silent?: boolean }) => void;
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
  canMoveDown,
}: TaskRowProps) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);

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
      
      // Further validate the date parts
      const [year, month, day] = datePart.split('-');
      if (!year || !month || !day || year.length !== 4) {
        console.warn('Invalid date parts:', { year, month, day });
        return "—";
      }
      
      // Try to create a Date object to validate
      const testDate = new Date(datePart + 'T12:00:00'); // Use noon to avoid timezone issues
      if (isNaN(testDate.getTime())) {
        console.warn('Date parsing failed:', datePart);
        return "—";
      }
      
      // Format as MM/dd/yy
      return format(testDate, "MM/dd/yy");
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return "—";
    }
  };

  const getIndentLevel = (hierarchyNumber?: string): number => {
    if (!hierarchyNumber) return 0;
    return hierarchyNumber.split('.').length - 1;
  };

  const indentLevel = getIndentLevel(task.hierarchy_number);

  const calculateEndDate = (startDate: string, duration: number): string => {
    try {
      if (!startDate || duration <= 0) {
        return new Date().toISOString().split('T')[0] + 'T00:00:00';
      }

      const start = startDate.split('T')[0]; // Get just the date part
      const endDate = calculateBusinessEndDate(start as DateString, duration - 1);
      const endDateStr = formatDisplayDate(endDate);
      
      return endDateStr + 'T00:00:00';
    } catch (error) {
      console.error('Error in calculateEndDate:', error, { startDate, duration });
      return new Date().toISOString().split('T')[0] + 'T00:00:00';
    }
  };

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
    } else if (field === "start_date" || field === "duration") {
      // For start date or duration changes, recalculate end date
      const newStartDate = field === "start_date" ? value as string : task.start_date;
      const newDuration = field === "duration" ? value as number : task.duration;
      
      if (newStartDate && newDuration > 0) {
        updates.end_date = calculateEndDate(newStartDate, newDuration);
      }
    }

    onTaskUpdate(task.id, updates);
  };

  // Parse predecessors for display
  const getPredecessorArray = (): string[] => {
    return safeParsePredecessors(task.predecessor);
  };

  // Check if this is an optimistic (unsaved) task
  const isOptimistic = task.id.startsWith('optimistic-');

  const handleOpenNotes = () => {
    setIsNotesDialogOpen(true);
  };

  const handleSaveNotes = (notes: string) => {
    onTaskUpdate(task.id, { notes });
  };

  return (
    <>
      <TaskContextMenu
        task={task}
        selectedTasks={selectedTasks}
        allTasks={allTasks}
        onIndent={onIndent}
        onOutdent={onOutdent}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onOpenNotes={handleOpenNotes}
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
                
                {/* Sticky note icon for tasks with notes */}
                {task.notes?.trim() && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsNotesDialogOpen(true);
                          }}
                        >
                          <StickyNote className="h-3 w-3 text-yellow-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View notes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
              displayFormat={(value) => {
                if (!value) return "—";
                try {
                  const date = new Date(value + "T12:00:00");
                  return format(date, "MM/dd/yyyy");
                } catch {
                  return "—";
                }
              }}
              readOnly={hasChildren}
            />
          </TableCell>

          {/* Duration */}
          <TableCell className="py-1 px-2">
            <InlineEditCell
              value={task.duration?.toString() || "1"}
              type="number"
              onSave={handleFieldUpdate("duration")}
              readOnly={hasChildren}
            />
          </TableCell>

          {/* End Date */}
          <TableCell className="py-1 px-2">
            <InlineEditCell
              value={(() => {
                try {
                  if (!task.end_date) return "";
                  const datePart = task.end_date.split("T")[0];
                  // Validate the date part before using it
                  const testDate = new Date(datePart + "T12:00:00");
                  if (isNaN(testDate.getTime())) {
                    console.warn('Invalid end_date for task:', task.task_name, task.end_date);
                    return "";
                  }
                  return datePart;
                } catch (error) {
                  console.error('Error processing end_date:', task.end_date, error);
                  return "";
                }
              })()}
              type="date"
              onSave={handleFieldUpdate("end_date")}
              displayFormat={(value) => {
                if (!value) return "—";
                try {
                  const date = new Date(value + "T12:00:00");
                  return format(date, "MM/dd/yyyy");
                } catch {
                  return "—";
                }
              }}
              readOnly={hasChildren}
            />
          </TableCell>

          {/* Predecessors */}
          <TableCell className="py-1 px-2">
            <PredecessorSelector
              value={getPredecessorArray()}
              onValueChange={handleFieldUpdate("predecessor")}
              allTasks={allTasks}
              currentTaskId={task.id}
              readOnly={hasChildren || isOptimistic}
            />
          </TableCell>

          {/* Progress */}
          <TableCell className="py-1 px-2">
            <ProgressSelector
              value={task.progress || 0}
              onSave={(value) => handleFieldUpdate("progress")(value)}
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
      
      <TaskNotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        taskName={task.task_name}
        initialValue={task.notes || ""}
        onSave={handleSaveNotes}
      />
    </>
  );
}