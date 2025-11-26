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
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to check if a task is overdue
  const isTaskOverdue = (endDate: string | null | undefined, progress: number | null | undefined): boolean => {
    if (!endDate) return false;
    
    // Don't mark as overdue if task is 100% complete
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

  // Auto-scroll to today
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const todayStr = today();
    const daysFromStart = getCalendarDaysBetween(startDate, todayStr) - 1;
    const todayPosition = Math.max(0, daysFromStart) * dayWidth;
    
    const containerWidth = scrollContainerRef.current.clientWidth;
    const scrollPosition = todayPosition - (containerWidth / 2);
    
    scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
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

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-auto"
    >
      <Table>
        <TableHeader className="z-50">
          <TableRow className="h-8">
            {/* Sticky Task Data Columns */}
            <TableHead className="sticky left-0 z-40 bg-background w-10 h-8 text-xs py-1 px-2 border-r">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="h-3 w-3"
                {...(isIndeterminate && { "data-state": "indeterminate" })}
              />
            </TableHead>
            <TableHead className="sticky left-10 z-40 bg-background w-20 h-8 text-xs py-1 px-2 border-r">#</TableHead>
            <TableHead className="sticky left-30 z-40 bg-background w-48 h-8 text-xs py-1 px-2 border-r">Task Name</TableHead>
            <TableHead className="sticky left-78 z-40 bg-background w-24 h-8 text-xs py-1 px-2 border-r whitespace-nowrap">Start Date</TableHead>
            <TableHead className="sticky left-102 z-40 bg-background w-20 h-8 text-xs py-1 px-2 border-r">Duration</TableHead>
            <TableHead className="sticky left-122 z-40 bg-background w-24 h-8 text-xs py-1 px-2 border-r whitespace-nowrap">End Date</TableHead>
            <TableHead className="sticky left-146 z-40 bg-background w-24 h-8 text-xs py-1 px-2 border-r">Predecessors</TableHead>
            <TableHead className="sticky left-170 z-40 bg-background w-20 h-8 text-xs py-1 px-2 border-r">Progress</TableHead>
            <TableHead className="sticky left-190 z-40 bg-background w-32 h-8 text-xs py-1 px-2 border-r">Resources</TableHead>
            
            {/* Timeline Header */}
            <TableHead className="sticky top-0 z-40 h-8 p-0" style={{ width: timelineWidth }}>
              <div className="flex flex-col h-8">
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
            </TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {visibleTasks.map((task, index) => {
            const position = getTaskPosition(task);
            const barColorClass = getBarColorClass(task);
            const progressWidth = (position.width * position.progress) / 100;
            const indentLevel = getIndentLevel(task.hierarchy_number);
            const taskHasChildren = hasChildren(task.id);
            const isExpanded = expandedTasks.has(task.id);
            const isSelected = selectedTasks.has(task.id);
            
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
                <TableRow 
                  className="hover:bg-muted/50"
                  style={{ height: '32px', maxHeight: '32px' }}
                >
                  {/* Selection Checkbox */}
                  <TableCell className="sticky left-0 z-30 bg-background py-1 px-2 w-10 h-8 overflow-hidden border-r">
                    <div
                      className={`h-3 w-3 border border-border rounded-sm cursor-pointer ${
                        isSelected ? 'bg-black' : 'bg-white'
                      }`}
                      onClick={() => handleTaskSelection(task.id, !isSelected)}
                    />
                  </TableCell>

                  {/* Hierarchy Number */}
                  <TableCell className="sticky left-10 z-30 bg-background text-xs py-1 px-2 w-20 h-8 overflow-hidden border-r">
                    <span className="text-xs">{task.hierarchy_number || "—"}</span>
                  </TableCell>

                  {/* Task Name with Indentation */}
                  <TableCell className="sticky left-30 z-30 bg-background py-1 pl-2 pr-2 w-48 h-8 overflow-hidden border-r">
                    <div className="flex items-center">
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
                  </TableCell>

                  {/* Start Date */}
                  <TableCell className="sticky left-78 z-30 bg-background py-1 px-2 h-8 overflow-hidden border-r">
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
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="sticky left-102 z-30 bg-background py-1 px-2 h-8 overflow-hidden border-r">
                    <InlineEditCell
                      value={task.duration?.toString() || "1"}
                      type="number"
                      onSave={(value) => handleTaskUpdate(task.id, { duration: parseInt(value.toString()) || 1 })}
                      className="text-xs"
                    />
                  </TableCell>

                  {/* End Date */}
                  <TableCell className={`sticky left-122 z-30 py-1 px-2 h-8 overflow-hidden border-r ${
                    isTaskOverdue(task.end_date, task.progress) ? "bg-red-500" : "bg-background"
                  }`}>
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
                      className={`text-xs ${isTaskOverdue(task.end_date, task.progress) ? "text-white font-semibold" : ""}`}
                    />
                  </TableCell>

                  {/* Predecessors */}
                  <TableCell className="sticky left-146 z-30 bg-background py-1 px-2 h-8 overflow-hidden border-r">
                    <PredecessorSelector
                      value={getPredecessorArray(task)}
                      onValueChange={(value) => handleTaskUpdate(task.id, { predecessor: value })}
                      allTasks={tasks}
                      currentTaskId={task.id}
                    />
                  </TableCell>

                  {/* Progress */}
                  <TableCell className="sticky left-170 z-30 bg-background py-1 px-2 h-8 overflow-hidden border-r">
                    <ProgressSelector
                      value={task.progress || 0}
                      onSave={(value) => handleTaskUpdate(task.id, { progress: value })}
                      readOnly={taskHasChildren}
                    />
                  </TableCell>

                  {/* Resources */}
                  <TableCell className="sticky left-190 z-30 bg-background py-1 px-2 h-8 overflow-hidden border-r">
                    <ResourcesSelector
                      value={task.resources || ""}
                      onValueChange={(value) => handleTaskUpdate(task.id, { resources: value })}
                    />
                  </TableCell>
                  
                  {/* Timeline Cell */}
                  <TableCell className="p-0 h-8 relative" style={{ width: timelineWidth }}>
                    {/* Vertical Grid Lines - CSS Grid Layout */}
                    <div 
                      className="absolute top-0 left-0 h-full pointer-events-none"
                      style={{
                        width: timelineWidth,
                        display: 'grid',
                        gridTemplateColumns: showWeekly 
                          ? `repeat(${months.reduce((sum, m) => sum + 5, 0)}, ${dayWidth * 7}px)`
                          : `repeat(${safeTotalDays}, ${dayWidth}px)`
                      }}
                    >
                      {showWeekly ? (
                        months.flatMap(month => 
                          [0, 1, 2, 3, 4].map(weekNum => (
                            <div
                              key={`${month.name}-week-${weekNum}`}
                              className="h-full border-r border-border/30"
                            />
                          ))
                        )
                      ) : (
                        Array.from({ length: safeTotalDays }, (_, i) => (
                          <div
                            key={i}
                            className="h-full border-r border-border/30"
                          />
                        ))
                      )}
                    </div>
                    
                    {/* Task Bar */}
                    <div
                      className="absolute h-6 rounded cursor-move border"
                      style={{
                        left: position.left,
                        width: position.width,
                        top: 3,
                        backgroundColor: `hsl(var(--timeline-${barColorClass}) / 0.25)`,
                        borderColor: `hsl(var(--timeline-${barColorClass}))`
                      }}
                    >
                      <div
                        className="h-full rounded-l opacity-80"
                        style={{
                          width: progressWidth,
                          backgroundColor: `hsl(var(--timeline-confirmed))`
                        }}
                      />
                      
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {task.task_name}
                        </span>
                      </div>
                    </div>
                    
                    {/* Dependency Lines (only render once on first row) */}
                    {index === 0 && connections.length > 0 && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{ 
                          left: 0, 
                          top: 0,
                          width: timelineWidth, 
                          height: visibleTasks.length * 32 
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
                  </TableCell>
                </TableRow>
              </TaskContextMenu>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}