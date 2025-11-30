import React, { useState, useEffect, useRef } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { canIndent } from "@/utils/hierarchyUtils";
import { canDropAt, computeDragDropUpdates, getDescendantIds } from "@/utils/dragDropLogic";
import { Checkbox } from "@/components/ui/checkbox";
import { parsePredecessors } from "@/utils/predecessorValidation";

import { InlineEditCell } from "./InlineEditCell";
import { ProgressSelector } from "./ProgressSelector";
import { PredecessorSelector } from "./PredecessorSelector";
import { ResourcesSelector } from "./ResourcesSelector";
import { ChevronRight, ChevronDown, GripVertical, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TaskContextMenu } from "./TaskContextMenu";
import { TaskNotesDialog } from "./TaskNotesDialog";
import { toast } from "sonner";
import {  
  DateString, 
  addDays, 
  getCalendarDaysBetween,
  getBusinessDaysBetween,
  calculateBusinessEndDate,
  isBusinessDay,
  today,
  getMonthName,
  getDayOfMonth,
  formatYMD,
  formatDisplayDateFull,
  parseDateString
} from "@/utils/dateOnly";

interface UnifiedScheduleTableProps {
  tasks: ProjectTask[];
  visibleTasks: ProjectTask[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onTaskUpdate: (taskId: string, updates: any, options?: { silent?: boolean }) => boolean | void | Promise<boolean>;
  selectedTasks: Set<string>;
  onSelectedTasksChange: (selectedTasks: Set<string>) => void;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (relativeTaskId: string) => void;
  onAddBelow: (relativeTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkDelete: () => void;
  onDragDrop: (draggedTaskId: string, targetTaskId: string, dropPosition: 'before' | 'after') => void;
  startDate: DateString;
  endDate: DateString;
  dayWidth: number;
  recentlySavedTasks?: Set<string>;
}

export function UnifiedScheduleTable({ 
  tasks,
  visibleTasks,
  expandedTasks,
  onToggleExpand,
  onTaskUpdate, 
  selectedTasks, 
  onSelectedTasksChange,
  onIndent,
  onOutdent,
  onAddAbove,
  onAddBelow,
  onDeleteTask,
  onBulkDelete,
  onDragDrop,
  startDate,
  endDate,
  dayWidth,
  recentlySavedTasks = new Set()
}: UnifiedScheduleTableProps) {
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Custom divider state - pixel-based width control (max 952px = full table width)
  const [leftPanelWidth, setLeftPanelWidth] = useState(952);
  
  // Notes dialog state
  const [notesDialogTaskId, setNotesDialogTaskId] = useState<string | null>(null);
  
  const handleOpenNotes = (taskId: string) => {
    setNotesDialogTaskId(taskId);
  };
  
  const handleSaveNotes = (notes: string) => {
    if (notesDialogTaskId) {
      onTaskUpdate(notesDialogTaskId, { notes });
    }
  };
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const dividerDragStartX = useRef<number>(0);
  const dividerDragStartWidth = useRef<number>(952);

  // Divider drag handlers
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
    dividerDragStartX.current = e.clientX;
    dividerDragStartWidth.current = leftPanelWidth;
  };

  useEffect(() => {
    if (!isDraggingDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dividerDragStartX.current;
      const newWidth = Math.max(300, Math.min(952, dividerDragStartWidth.current + delta));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider]);

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  
  // Context menu highlight state
  const [contextMenuTaskId, setContextMenuTaskId] = useState<string | null>(null);

  // Sync left panel vertical scroll when timeline scrolls (only timeline has scrollbar)
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Handle wheel events on left panel - forward to timeline for synchronized scrolling
  const handleLeftPanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop += e.deltaY;
    }
  };

  // Helper function to check if a task is overdue
  const isTaskOverdue = (endDate: string | null | undefined, progress: number | null | undefined): boolean => {
    if (!endDate) return false;
    if (progress === 100) return false;
    
    try {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const taskEndDate = new Date(endDate.split("T")[0] + "T12:00:00");
      taskEndDate.setHours(0, 0, 0, 0);
      
      return taskEndDate < todayDate;
    } catch {
      return false;
    }
  };

  // Calculate timeline width
  const totalDays = getCalendarDaysBetween(startDate, endDate);
  const maxDays = 1095;
  const safeTotalDays = Math.min(totalDays, maxDays);
  const timelineWidth = safeTotalDays * dayWidth;

  // Auto-scroll timeline to today
  useEffect(() => {
    if (!timelineScrollRef.current) return;

    const todayStr = today();
    const daysFromStart = getCalendarDaysBetween(startDate, todayStr) - 1;
    const todayPosition = Math.max(0, daysFromStart) * dayWidth;
    
    const containerWidth = timelineScrollRef.current.clientWidth;
    const scrollPosition = todayPosition - (containerWidth / 2);
    
    timelineScrollRef.current.scrollLeft = Math.max(0, scrollPosition);
  }, [startDate, dayWidth]);

  // Task update handler - parent cascade is handled by useTaskMutations
  const handleTaskUpdate = async (taskId: string, updates: any, options?: { silent?: boolean }) => {
    const success = await onTaskUpdate(taskId, updates, options);
    // Parent cascade and dependent updates are handled centrally in useTaskMutations
    return success;
  };

  const hasChildren = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.hierarchy_number) return false;
    
    return tasks.some(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(task.hierarchy_number + ".") &&
      t.hierarchy_number.split(".").length === task.hierarchy_number.split(".").length + 1
    );
  };

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    const newSet = new Set(selectedTasks);
    if (checked) {
      newSet.add(taskId);
    } else {
      newSet.delete(taskId);
    }
    onSelectedTasksChange(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedTasksChange(new Set(visibleTasks.map(task => task.id)));
    } else {
      onSelectedTasksChange(new Set());
    }
  };

  const isAllSelected = visibleTasks.length > 0 && visibleTasks.every(task => selectedTasks.has(task.id));
  const isIndeterminate = selectedTasks.size > 0 && !isAllSelected;

  // Helper functions for task actions
  const getCanIndent = (task: ProjectTask) => canIndent(task, tasks);
  
  const getCanOutdent = (task: ProjectTask) => {
    return task.hierarchy_number && 
           task.hierarchy_number.includes('.') && 
           task.hierarchy_number.split('.').length === 2;
  };

  const getIndentLevel = (hierarchyNumber: string | null) => {
    if (!hierarchyNumber) return 0;
    return (hierarchyNumber.match(/\./g) || []).length;
  };

  const getPredecessorArray = (task: ProjectTask): string[] => {
    if (!task.predecessor) return [];
    if (Array.isArray(task.predecessor)) return task.predecessor;
    try {
      const parsed = JSON.parse(task.predecessor);
      return Array.isArray(parsed) ? parsed : [task.predecessor];
    } catch {
      return [task.predecessor];
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
    
    // Create a custom drag image (optional)
    const draggedElement = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(draggedElement, 20, 16);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    
    if (!draggedTaskId || draggedTaskId === taskId) {
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === taskId);
    
    if (!draggedTask || !targetTask || !canDropAt(draggedTask, targetTask, tasks)) {
      e.dataTransfer.dropEffect = 'none';
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    
    // Determine if dropping before or after based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';
    
    setDropTargetId(taskId);
    setDropPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the row entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    
    if (!draggedTaskId || !dropPosition || draggedTaskId === taskId) {
      resetDragState();
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === taskId);
    
    if (!draggedTask || !targetTask || !canDropAt(draggedTask, targetTask, tasks)) {
      resetDragState();
      return;
    }

    // Trigger the drag-drop handler in parent
    onDragDrop(draggedTaskId, taskId, dropPosition);
    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedTaskId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  // Get descendant IDs for styling during drag
  const getDraggedDescendants = (): Set<string> => {
    if (!draggedTaskId) return new Set();
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) return new Set();
    return new Set(getDescendantIds(draggedTask, tasks));
  };

  const draggedDescendants = getDraggedDescendants();

  // Timeline functions
  const parseTaskDate = (dateStr: string): DateString => {
    try {
      if (!dateStr || dateStr === 'Invalid Date') return addDays(startDate, 0);
      const datePart = dateStr.split('T')[0].split(' ')[0];
      if (!datePart || datePart.length < 10) return addDays(startDate, 0);
      return datePart;
    } catch (error) {
      return addDays(startDate, 0);
    }
  };

  const getTaskPosition = (task: ProjectTask) => {
    try {
      if (!task.start_date || !task.end_date) {
        return { left: 0, width: 40, progress: task.progress || 0 };
      }
      
      const taskStartDate = parseTaskDate(task.start_date);
      const taskEndDate = parseTaskDate(task.end_date);
      
      // Calculate days from timeline start using direct difference (not inclusive count)
      const startParsed = parseDateString(startDate);
      const taskParsed = parseDateString(taskStartDate);
      const startDateObj = new Date(startParsed.year, startParsed.month - 1, startParsed.day);
      const taskDateObj = new Date(taskParsed.year, taskParsed.month - 1, taskParsed.day);
      const daysFromStart = Math.round((taskDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      const widthDays = getCalendarDaysBetween(taskStartDate, taskEndDate);
      
      return {
        left: Math.max(0, daysFromStart) * dayWidth,
        width: Math.max(dayWidth, widthDays * dayWidth),
        progress: task.progress || 0
      };
    } catch (error) {
      return { left: 0, width: 40, progress: task.progress || 0 };
    }
  };

  // Generate dependencies
  const generateDependencyConnections = () => {
    const connections: {
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[] = [];

    visibleTasks.forEach((task, taskIndex) => {
      let predecessorList: string[] = [];
      
      if (Array.isArray(task.predecessor)) {
        predecessorList = task.predecessor;
      } else if (task.predecessor) {
        try {
          const parsed = JSON.parse(task.predecessor);
          predecessorList = Array.isArray(parsed) ? parsed : [task.predecessor];
        } catch {
          predecessorList = [task.predecessor];
        }
      }
      
      if (!predecessorList.length) return;

      const taskPosition = getTaskPosition(task);
      const toY = taskIndex * 32 + 16;
      const toX = taskPosition.left;

      const parsedPreds = parsePredecessors(predecessorList, tasks);
      
      parsedPreds.forEach(pred => {
        if (!pred.isValid) return;

        const predTask = visibleTasks.find(t => t.hierarchy_number === pred.taskId);
        if (!predTask) return;

        const predIndex = visibleTasks.indexOf(predTask);
        const predPosition = getTaskPosition(predTask);
        
        const fromY = predIndex * 32 + 16;
        const fromX = predPosition.left + predPosition.width;

        connections.push({
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY }
        });
      });
    });

    return connections;
  };

  const connections = generateDependencyConnections();

  // Generate month blocks for weekly view calculations
  const months: { name: string; width: number; left: number }[] = [];
  let currentMonthStart = 0;
  let currentMonth = getMonthName(startDate);
  
  for (let day = 0; day < safeTotalDays; day++) {
    const dayDate = addDays(startDate, day);
    const monthName = getMonthName(dayDate);
    
    if (monthName !== currentMonth || day === safeTotalDays - 1) {
      const dayCount = day === safeTotalDays - 1 ? day - currentMonthStart + 1 : day - currentMonthStart;
      months.push({
        name: currentMonth,
        width: dayCount * dayWidth,
        left: currentMonthStart * dayWidth
      });
      currentMonth = monthName;
      currentMonthStart = day;
    }
  }

  // Generate month labels positioned above EVERY weekend
  const monthLabels: { name: string; left: number; width: number }[] = [];

  for (let day = 0; day < safeTotalDays; day++) {
    const dayDate = addDays(startDate, day);
    const { year, month } = parseDateString(dayDate);
    const monthName = getMonthName(dayDate);
    
    // Check if this is a Saturday (start of weekend)
    const date = new Date(year, month - 1, parseInt(getDayOfMonth(dayDate)));
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 6) {
      // Add label for EVERY Saturday/Sunday pair
      monthLabels.push({
        name: monthName,
        left: day * dayWidth,
        width: dayWidth * 2 // Span across Sat + Sun
      });
    }
  }

  const showWeekly = dayWidth <= 12;

  const getBarColorClass = (task: ProjectTask) => {
    if (task.confirmed === false) return "unconfirmed";
    if (task.confirmed === true) return "confirmed";
    return "default";
  };

  // Row height constant
  const ROW_HEIGHT = 32;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 220px)' }}>
      {/* LEFT PANEL - Task Data (pixel-controlled width, no gap possible) */}
      <div 
        style={{ width: leftPanelWidth, flexShrink: 0 }} 
        className="overflow-hidden"
      >
        <div 
          ref={leftPanelRef}
          className="bg-white border-r border-gray-300 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden"
          style={{ 
            width: '952px', 
            height: '100%',
            scrollbarWidth: 'none'
          }}
          onWheel={handleLeftPanelWheel}
        >
        {/* Left Panel Header */}
        <div 
          className="sticky top-0 z-20 bg-white"
          style={{ height: ROW_HEIGHT }}
        >
          <div className="flex" style={{ height: ROW_HEIGHT }}>
            <div className="w-10 shrink-0 flex items-center justify-center border-r border-b border-gray-200 px-2" style={{ height: ROW_HEIGHT }}>
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                {...(isIndeterminate && { "data-state": "indeterminate" })}
              />
            </div>
            <div className="w-12 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium" style={{ height: ROW_HEIGHT }}>#</div>
            <div className="w-72 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium" style={{ height: ROW_HEIGHT }}>Task Name</div>
            <div className="w-24 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium whitespace-nowrap" style={{ height: ROW_HEIGHT }}>Start Date</div>
            <div className="w-20 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium" style={{ height: ROW_HEIGHT }}>Duration</div>
            <div className="w-24 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium whitespace-nowrap" style={{ height: ROW_HEIGHT }}>End Date</div>
            <div className="w-24 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium" style={{ height: ROW_HEIGHT }}>Predecessors</div>
            <div className="w-20 shrink-0 flex items-center border-r border-b border-gray-200 px-2 text-xs font-medium" style={{ height: ROW_HEIGHT }}>Progress</div>
            <div className="w-32 shrink-0 flex items-center border-b border-gray-200 px-2 text-xs font-medium" style={{ height: ROW_HEIGHT }}>Resources</div>
          </div>
        </div>

        {/* Left Panel Body */}
        <div>
          {visibleTasks.map((task) => {
            const indentLevel = getIndentLevel(task.hierarchy_number);
            const taskHasChildren = hasChildren(task.id);
            const isExpanded = expandedTasks.has(task.id);
            const isSelected = selectedTasks.has(task.id);
            const isOverdue = isTaskOverdue(task.end_date, task.progress);
            const isRecentlySaved = recentlySavedTasks.has(task.id);
            
            // Drag state styling
            const isDragging = draggedTaskId === task.id;
            const isDraggedDescendant = draggedDescendants.has(task.id);
            const isDropTarget = dropTargetId === task.id;
            const canDrop = draggedTaskId && !isDragging && !isDraggedDescendant;

            return (
              <TaskContextMenu
                key={task.id}
                task={task}
                selectedTasks={selectedTasks}
                allTasks={tasks}
                onIndent={() => getCanIndent(task) && onIndent(task.id)}
                onOutdent={() => getCanOutdent(task) && onOutdent(task.id)}
                onAddAbove={() => onAddAbove(task.id)}
                onAddBelow={() => onAddBelow(task.id)}
                onDelete={() => onDeleteTask(task.id)}
                onBulkDelete={selectedTasks.size > 1 ? onBulkDelete : () => {}}
                onOpenNotes={() => handleOpenNotes(task.id)}
                canIndent={getCanIndent(task)}
                canOutdent={getCanOutdent(task)}
                onContextMenuChange={(isOpen) => setContextMenuTaskId(isOpen ? task.id : null)}
              >
                <div 
                  className={`flex border-b border-gray-100 ${contextMenuTaskId === task.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'} relative transition-colors duration-300 ${
                    isDragging ? 'opacity-50 bg-blue-50' : ''
                  } ${isDraggedDescendant ? 'opacity-30' : ''} ${
                    isRecentlySaved ? 'bg-green-100 animate-pulse' : ''
                  }`}
                  style={{ height: ROW_HEIGHT }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, task.id)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Drop indicator line */}
                  {isDropTarget && dropPosition && (
                    <div 
                      className="absolute left-0 right-0 h-0.5 bg-blue-500 z-30 pointer-events-none"
                      style={{ 
                        top: dropPosition === 'before' ? 0 : ROW_HEIGHT - 2
                      }}
                    />
                  )}

                  {/* Checkbox */}
                  <div className="w-10 shrink-0 flex items-center justify-center border-r border-gray-200 px-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleTaskSelection(task.id, !!checked)}
                    />
                  </div>

                  {/* Hierarchy Number with Drag Handle */}
                  <div className="w-12 shrink-0 flex items-center border-r border-gray-200 px-1 gap-1">
                    <GripVertical className="h-3 w-3 text-gray-400 cursor-grab hover:text-gray-600 flex-shrink-0" />
                    <span className="text-xs">{task.hierarchy_number || "—"}</span>
                  </div>

                  {/* Task Name */}
                  <div className="w-72 shrink-0 flex items-center border-r border-gray-200 px-2 overflow-hidden">
                    <div className="flex items-center w-full">
                      {indentLevel > 0 && <div style={{ width: `${indentLevel * 16}px` }} />}
                      {taskHasChildren && (
                        <button
                          onClick={() => onToggleExpand(task.id)}
                          className="mr-1 hover:bg-muted rounded p-0.5 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      {!taskHasChildren && <div className="w-4 mr-1" />}
                      <InlineEditCell
                        value={task.task_name || ""}
                        type="text"
                        onSave={(value) => handleTaskUpdate(task.id, { task_name: value.toString() })}
                        className="text-xs flex-1"
                      />
                      {task.notes?.trim() && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-muted flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenNotes(task.id);
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

                  {/* Start Date */}
                  <div className="w-24 shrink-0 flex items-center border-r border-gray-200 px-2">
                    <InlineEditCell
                      value={(() => {
                        try {
                          return task.start_date ? formatYMD(task.start_date.split('T')[0]) : "";
                        } catch {
                          return "";
                        }
                      })()}
                      type="date"
                      onSave={(value) => {
                        if (value) {
                          handleTaskUpdate(task.id, { start_date: value });
                        }
                      }}
                      displayFormat={(val) => formatDisplayDateFull(val as string)}
                      className="text-xs"
                      readOnly={taskHasChildren}
                    />
                  </div>

                  {/* Duration */}
                  <div className="w-20 shrink-0 flex items-center border-r border-gray-200 px-2">
                    <InlineEditCell
                      value={task.duration?.toString() || "1"}
                      type="number"
                      onSave={(value) => handleTaskUpdate(task.id, { duration: parseInt(value.toString()) || 1 })}
                      className="text-xs"
                      readOnly={taskHasChildren}
                    />
                  </div>

                  {/* End Date */}
                  <div 
                    className={`w-24 shrink-0 flex items-center border-r border-gray-200 px-2 ${
                      isOverdue ? 'bg-red-500' : ''
                    }`}
                  >
                    <InlineEditCell
                      value={(() => {
                        try {
                          return task.end_date ? formatYMD(task.end_date.split('T')[0]) : "";
                        } catch {
                          return "";
                        }
                      })()}
                      type="date"
                      onSave={(value) => {
                        if (value) {
                          const newEndDate = value.toString().split('T')[0];
                          const taskStartDate = task.start_date?.split('T')[0];
                          
                          // Validate: end date must be >= start date
                          if (taskStartDate && newEndDate < taskStartDate) {
                            toast.error("End date cannot be before start date", {
                              description: `Start date is ${formatDisplayDateFull(taskStartDate)}. End date must be on or after this date.`,
                              style: {
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none'
                              },
                              classNames: {
                                description: '!text-white'
                              }
                            });
                            return;
                          }
                          
                          // Calculate new duration (business days between start and end, inclusive)
                          let newDuration = 1;
                          if (taskStartDate) {
                            newDuration = getBusinessDaysBetween(taskStartDate as DateString, newEndDate as DateString);
                          }
                          
                          // Update both end_date and duration
                          handleTaskUpdate(task.id, { 
                            end_date: newEndDate + 'T00:00:00',
                            duration: newDuration
                          });
                        }
                      }}
                      displayFormat={(val) => formatDisplayDateFull(val as string)}
                      className={`text-xs ${isOverdue ? "text-white font-semibold" : ""}`}
                      readOnly={taskHasChildren}
                    />
                  </div>

                  {/* Predecessors */}
                  <div className="w-24 shrink-0 flex items-center border-r border-gray-200 px-2">
                    <PredecessorSelector
                      value={getPredecessorArray(task)}
                      onValueChange={(value) => handleTaskUpdate(task.id, { predecessor: value })}
                      allTasks={tasks}
                      currentTaskId={task.id}
                      readOnly={taskHasChildren}
                    />
                  </div>

                  {/* Progress */}
                  <div className="w-20 shrink-0 flex items-center border-r border-gray-200 px-2">
                    <ProgressSelector
                      value={task.progress || 0}
                      onSave={(value) => handleTaskUpdate(task.id, { progress: value })}
                      readOnly={taskHasChildren}
                    />
                  </div>

                  {/* Resources */}
                  <div className="w-32 shrink-0 flex items-center px-2">
                    <ResourcesSelector
                      value={task.resources || ""}
                      onValueChange={(value) => handleTaskUpdate(task.id, { resources: value })}
                      readOnly={taskHasChildren}
                    />
                  </div>
                </div>
              </TaskContextMenu>
            );
          })}
        </div>
        </div>
      </div>

      {/* CUSTOM DRAGGABLE DIVIDER - pixel-based control */}
      <div 
        className={`w-1 cursor-col-resize transition-colors flex-shrink-0 ${
          isDraggingDivider ? 'bg-blue-500' : 'bg-gray-300 hover:bg-blue-400'
        }`}
        onMouseDown={handleDividerMouseDown}
      />

      {/* RIGHT PANEL - Timeline (always flush against divider, no gap) */}
      <div 
        ref={timelineScrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleTimelineScroll}
      >
        <div style={{ width: timelineWidth, minWidth: timelineWidth }}>
          {/* Timeline Header */}
          <div 
            className="sticky top-0 z-10 bg-white border-b border-gray-200"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex flex-col h-full">
              {/* Month Labels - positioned above weekends */}
              <div className="relative h-4 border-b border-border bg-muted/30">
                {monthLabels.map((label, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full flex items-center justify-center font-semibold text-xs text-foreground"
                    style={{ left: label.left, width: label.width }}
                  >
                    {label.name}
                  </div>
                ))}
              </div>
              
              {/* Day/Week Headers */}
              <div className="relative h-4">
                {showWeekly ? (
                  months.flatMap((month, monthIndex) => {
                    const weekWidth = month.width / 4;
                    return [1, 2, 3, 4].map(weekNum => (
                      <div
                        key={`${monthIndex}-week-${weekNum}`}
                        className="absolute top-0 h-full flex items-center justify-center border-r border-border text-xs bg-background"
                        style={{ left: month.left + (weekNum - 1) * weekWidth, width: weekWidth }}
                      >
                        {weekNum}
                      </div>
                    ));
                  })
                ) : (
                  Array.from({ length: safeTotalDays }, (_, i) => {
                    const dayDate = addDays(startDate, i);
                    const isWeekend = !isBusinessDay(dayDate);
                    
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 h-full flex items-center justify-center border-r border-border text-xs ${
                          isWeekend ? "bg-blue-100 text-blue-700" : "bg-background"
                        }`}
                        style={{ left: i * dayWidth, width: dayWidth }}
                      >
                        {getDayOfMonth(dayDate)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Timeline Body */}
          <div className="relative" style={{ height: visibleTasks.length * ROW_HEIGHT }}>
            {/* Grid Lines Background */}
            <div className="absolute inset-0 pointer-events-none">
              {showWeekly ? (
                months.flatMap((month, monthIndex) => {
                  const weekWidth = month.width / 4;
                  return [0, 1, 2, 3].map(weekNum => (
                    <div
                      key={`grid-${monthIndex}-week-${weekNum}`}
                      className="absolute top-0 h-full border-r border-border/30 bg-transparent"
                      style={{ left: month.left + weekNum * weekWidth, width: weekWidth }}
                    />
                  ));
                })
              ) : (
                Array.from({ length: safeTotalDays }, (_, i) => {
                  const dayDate = addDays(startDate, i);
                  const isWeekend = !isBusinessDay(dayDate);
                  
                  return (
                    <div
                      key={`grid-${i}`}
                      className={`absolute top-0 h-full border-r border-border/30 ${
                        isWeekend ? "bg-blue-50" : "bg-white"
                      }`}
                      style={{ left: i * dayWidth, width: dayWidth }}
                    />
                  );
                })
              )}
            </div>

            {/* Row Separators */}
            {visibleTasks.map((_, index) => (
              <div
                key={`row-sep-${index}`}
                className="absolute w-full border-b border-gray-100"
                style={{ top: (index + 1) * ROW_HEIGHT - 1 }}
              />
            ))}

            {/* Task Bars */}
            {visibleTasks.map((task, index) => {
              const position = getTaskPosition(task);
              const barColorClass = getBarColorClass(task);
              const progressWidth = (position.width * position.progress) / 100;

              return (
                <div
                  key={task.id}
                  className="absolute"
                  style={{ top: index * ROW_HEIGHT + 3 }}
                >
                  {/* The bar itself */}
                  <div
                    className="absolute h-6 rounded cursor-move border"
                    style={{
                      left: position.left,
                      width: position.width,
                      backgroundColor: `hsl(var(--timeline-${barColorClass}) / 0.25)`,
                      borderColor: `hsl(var(--timeline-${barColorClass}))`
                    }}
                  >
                    {/* Progress fill */}
                    <div
                      className="h-full rounded-l opacity-80"
                      style={{
                        width: progressWidth,
                        backgroundColor: `hsl(var(--timeline-progress))`
                      }}
                    />
                  </div>
                  
                  {/* Task name - always displayed outside the bar to the right */}
                  <div
                    className="absolute h-6 flex items-center pl-2 whitespace-nowrap"
                    style={{
                      left: position.left + position.width + 16,
                    }}
                  >
                    <span className="text-xs font-medium text-foreground">
                      {task.task_name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Dependency Lines */}
            {connections.length > 0 && (
              <svg
                className="absolute pointer-events-none"
                style={{ 
                  left: 0, 
                  top: 0,
                  width: timelineWidth, 
                  height: visibleTasks.length * ROW_HEIGHT 
                }}
              >
                {connections.map((connection, connIndex) => {
                  const { from, to } = connection;
                  
                  // 5-segment path matching BuildTools pattern:
                  // 1. Exit RIGHT from predecessor bar end
                  // 2. Small vertical DROP
                  // 3. Go LEFT to vertical line position
                  // 4. Go DOWN to target row
                  // 5. Go RIGHT to arrow
                  
                  const exitX = from.x + 12;        // Exit 12px RIGHT of predecessor end
                  const dropY = from.y + 16;        // Drop 16px down to clear below predecessor bar
                  const verticalX = to.x - 15;      // Vertical line position (15px left of target)
                  
                  const pathData = `M ${from.x} ${from.y}
                                   L ${exitX} ${from.y}
                                   L ${exitX} ${dropY}
                                   L ${verticalX} ${dropY}
                                   L ${verticalX} ${to.y}
                                   L ${to.x - 8} ${to.y}`;

                  return (
                    <g key={connIndex}>
                      <path
                        d={pathData}
                        stroke="black"
                        strokeWidth="1"
                        fill="none"
                      />
                      <polygon
                        points={`${to.x - 8},${to.y - 4} ${to.x},${to.y} ${to.x - 8},${to.y + 4}`}
                        fill="black"
                      />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
      
      {/* Task Notes Dialog */}
      {notesDialogTaskId && (
        <TaskNotesDialog
          open={!!notesDialogTaskId}
          onOpenChange={(open) => !open && setNotesDialogTaskId(null)}
          taskName={tasks.find(t => t.id === notesDialogTaskId)?.task_name || ""}
          initialValue={tasks.find(t => t.id === notesDialogTaskId)?.notes || ""}
          onSave={handleSaveNotes}
        />
      )}
    </div>
  );
}
