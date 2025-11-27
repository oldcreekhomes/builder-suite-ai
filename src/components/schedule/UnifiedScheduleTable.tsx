import React, { useState, useEffect, useRef } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { canIndent } from "@/utils/hierarchyUtils";
import { calculateParentTaskValues, shouldUpdateParentTask } from "@/utils/taskCalculations";
import * as moveDownUtils from "@/utils/moveDownLogic";
import { Checkbox } from "@/components/ui/checkbox";
import { parsePredecessors } from "@/utils/predecessorValidation";
import { InlineEditCell } from "./InlineEditCell";
import { ProgressSelector } from "./ProgressSelector";
import { PredecessorSelector } from "./PredecessorSelector";
import { ResourcesSelector } from "./ResourcesSelector";
import { ChevronRight, ChevronDown } from "lucide-react";
import { TaskContextMenu } from "./TaskContextMenu";
import {  
  DateString, 
  addDays, 
  getCalendarDaysBetween, 
  calculateBusinessEndDate,
  isBusinessDay,
  today,
  getMonthName,
  getDayOfMonth,
  formatYMD,
  formatDisplayDateFull
} from "@/utils/dateOnly";

interface UnifiedScheduleTableProps {
  tasks: ProjectTask[];
  visibleTasks: ProjectTask[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onTaskUpdate: (taskId: string, updates: any, options?: { silent?: boolean }) => void;
  selectedTasks: Set<string>;
  onSelectedTasksChange: (selectedTasks: Set<string>) => void;
  onIndent: (taskId: string) => void;
  onOutdent: (taskId: string) => void;
  onAddAbove: (relativeTaskId: string) => void;
  onAddBelow: (relativeTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkDelete: () => void;
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
  startDate: DateString;
  endDate: DateString;
  dayWidth: number;
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
  onMoveUp,
  onMoveDown,
  startDate,
  endDate,
  dayWidth
}: UnifiedScheduleTableProps) {
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

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

  // Enhanced task update with parent cascade
  const handleTaskUpdate = (taskId: string, updates: any, options?: { silent?: boolean }) => {
    onTaskUpdate(taskId, updates, options);
    
    requestAnimationFrame(() => {
      const updatedTask = tasks.find(t => t.id === taskId);
      if (!updatedTask?.hierarchy_number) return;
      
      const simulatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      const parentTasks = tasks.filter(task => {
        if (!task.hierarchy_number || task.id === taskId) return false;
        
        const taskParts = updatedTask.hierarchy_number.split('.');
        const parentParts = task.hierarchy_number.split('.');
        
        if (parentParts.length >= taskParts.length) return false;
        
        return parentParts.every((part, index) => part === taskParts[index]);
      });
      
      parentTasks.forEach(parentTask => {
        const calculations = calculateParentTaskValues(parentTask, simulatedTasks);
        if (calculations && shouldUpdateParentTask(parentTask, calculations)) {
          setTimeout(() => {
            onTaskUpdate(parentTask.id, {
              start_date: calculations.startDate,
              end_date: calculations.endDate,
              duration: calculations.duration,
              progress: calculations.progress
            }, { silent: true });
          }, 50);
        }
      });
    });
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

  const getCanMoveUp = (task: ProjectTask) => {
    const currentIndex = visibleTasks.findIndex(t => t.id === task.id);
    return currentIndex > 0;
  };

  const getCanMoveDown = (task: ProjectTask) => {
    return moveDownUtils.canMoveDown(task, visibleTasks);
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
      const daysFromStart = getCalendarDaysBetween(startDate, taskStartDate) - 1;
      const taskDuration = task.duration || 1;
      const correctEndDate = calculateBusinessEndDate(taskStartDate, taskDuration);
      const widthDays = getCalendarDaysBetween(taskStartDate, correctEndDate);
      
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

  // Generate month headers
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
      {/* LEFT PANEL - Task Data (fixed, no horizontal scroll) */}
      <div 
        ref={leftPanelRef}
        className="flex-shrink-0 bg-white border-r-4 border-gray-200 shadow-md overflow-hidden"
        style={{ width: '952px' }}
        onWheel={handleLeftPanelWheel}
      >
        {/* Left Panel Header */}
        <div 
          className="sticky top-0 z-20 bg-white border-b border-gray-200"
          style={{ height: ROW_HEIGHT }}
        >
          <div className="flex h-full">
            <div className="w-10 flex items-center justify-center border-r border-gray-200 px-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="h-3 w-3"
                {...(isIndeterminate && { "data-state": "indeterminate" })}
              />
            </div>
            <div className="w-12 flex items-center border-r border-gray-200 px-2 text-xs font-medium">#</div>
            <div className="w-72 flex items-center border-r border-gray-200 px-2 text-xs font-medium">Task Name</div>
            <div className="w-24 flex items-center border-r border-gray-200 px-2 text-xs font-medium whitespace-nowrap">Start Date</div>
            <div className="w-20 flex items-center border-r border-gray-200 px-2 text-xs font-medium">Duration</div>
            <div className="w-24 flex items-center border-r border-gray-200 px-2 text-xs font-medium whitespace-nowrap">End Date</div>
            <div className="w-24 flex items-center border-r border-gray-200 px-2 text-xs font-medium">Predecessors</div>
            <div className="w-20 flex items-center border-r border-gray-200 px-2 text-xs font-medium">Progress</div>
            <div className="w-32 flex items-center px-2 text-xs font-medium">Resources</div>
          </div>
        </div>

        {/* Left Panel Body */}
        <div>
          {visibleTasks.map((task) => {
            const indentLevel = getIndentLevel(task.hierarchy_number);
            const taskHasChildren = hasChildren(task.id);
            const isExpanded = expandedTasks.has(task.id);
            const isSelected = selectedTasks.has(task.id);
            const overdue = isTaskOverdue(task.end_date, task.progress);

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
                onMoveUp={() => getCanMoveUp(task) && onMoveUp(task.id)}
                onMoveDown={() => getCanMoveDown(task) && onMoveDown(task.id)}
                onOpenNotes={() => {}}
                canIndent={getCanIndent(task)}
                canOutdent={getCanOutdent(task)}
                canMoveUp={getCanMoveUp(task)}
                canMoveDown={getCanMoveDown(task)}
                onContextMenuChange={() => {}}
              >
                <div 
                  className="flex border-b border-gray-100 bg-white hover:bg-gray-50"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Checkbox */}
                  <div className="w-10 flex items-center justify-center border-r border-gray-200 px-2">
                    <div
                      className={`h-3 w-3 border border-border rounded-sm cursor-pointer ${
                        isSelected ? 'bg-black' : 'bg-white'
                      }`}
                      onClick={() => handleTaskSelection(task.id, !isSelected)}
                    />
                  </div>

                  {/* Hierarchy Number */}
                  <div className="w-12 flex items-center border-r border-gray-200 px-2">
                    <span className="text-xs">{task.hierarchy_number || "—"}</span>
                  </div>

                  {/* Task Name */}
                  <div className="w-72 flex items-center border-r border-gray-200 px-2 overflow-hidden">
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
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="w-24 flex items-center border-r border-gray-200 px-2">
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
                    />
                  </div>

                  {/* Duration */}
                  <div className="w-20 flex items-center border-r border-gray-200 px-2">
                    <InlineEditCell
                      value={task.duration?.toString() || "1"}
                      type="number"
                      onSave={(value) => handleTaskUpdate(task.id, { duration: parseInt(value.toString()) || 1 })}
                      className="text-xs"
                    />
                  </div>

                  {/* End Date */}
                  <div 
                    className={`w-24 flex items-center border-r border-gray-200 px-2 ${
                      overdue ? 'bg-red-500' : ''
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
                          handleTaskUpdate(task.id, { end_date: value });
                        }
                      }}
                      displayFormat={(val) => formatDisplayDateFull(val as string)}
                      className={`text-xs ${overdue ? "text-white font-semibold" : ""}`}
                    />
                  </div>

                  {/* Predecessors */}
                  <div className="w-24 flex items-center border-r border-gray-200 px-2">
                    <PredecessorSelector
                      value={getPredecessorArray(task)}
                      onValueChange={(value) => handleTaskUpdate(task.id, { predecessor: value })}
                      allTasks={tasks}
                      currentTaskId={task.id}
                    />
                  </div>

                  {/* Progress */}
                  <div className="w-20 flex items-center border-r border-gray-200 px-2">
                    <ProgressSelector
                      value={task.progress || 0}
                      onSave={(value) => handleTaskUpdate(task.id, { progress: value })}
                      readOnly={taskHasChildren}
                    />
                  </div>

                  {/* Resources */}
                  <div className="w-32 flex items-center px-2">
                    <ResourcesSelector
                      value={task.resources || ""}
                      onValueChange={(value) => handleTaskUpdate(task.id, { resources: value })}
                    />
                  </div>
                </div>
              </TaskContextMenu>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL - Timeline (independent horizontal & vertical scroll) */}
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
              {/* Month Headers */}
              <div className="relative h-4 border-b border-border">
                {months.map((month, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full flex items-center justify-center border-r border-border bg-muted/30 font-medium text-xs"
                    style={{ left: month.left, width: month.width }}
                  >
                    {month.name}
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
                        backgroundColor: `hsl(var(--timeline-confirmed))`
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
                  const rightOffset = 10;
                  const leftOffset = 23;
                  const rightTurnX = from.x + rightOffset;
                  const intermediateY = from.y + (to.y - from.y) * 0.47;
                  const leftTurnX = rightTurnX - leftOffset;
                  
                  const pathData = `M ${from.x} ${from.y} 
                                   L ${rightTurnX} ${from.y} 
                                   L ${rightTurnX} ${intermediateY}
                                   L ${leftTurnX} ${intermediateY}
                                   L ${leftTurnX} ${to.y}
                                   L ${to.x} ${to.y}`;

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
    </div>
  );
}
