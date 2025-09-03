import React, { useEffect, useRef } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBar } from "./TimelineBar";
import { parsePredecessors } from "@/utils/predecessorValidation";
import { 
  DateString, 
  addDays, 
  getCalendarDaysBetween, 
  calculateBusinessEndDate,
  isBusinessDay,
  today 
} from "@/utils/dateOnly";

interface TimelineProps {
  tasks: ProjectTask[];
  startDate: DateString;
  endDate: DateString;
  onTaskUpdate: (taskId: string, updates: any, options?: { silent?: boolean }) => void;
  dayWidth?: number;
}

export function Timeline({ tasks, startDate, endDate, onTaskUpdate, dayWidth = 40 }: TimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate timeline width with hard limits for performance
  const totalDays = getCalendarDaysBetween(startDate, endDate);
  
  // Hard guard: Cap total days to prevent performance issues
  const maxDays = 1095; // 3 years worth of days
  const safeTotalDays = Math.min(totalDays, maxDays);
  
  const timelineWidth = safeTotalDays * dayWidth;
  
  if (totalDays > maxDays) {
    console.warn(`⚠️ Timeline capped at ${maxDays} days for performance (was ${totalDays} days)`);
  }

  // Auto-scroll to today's date on first render
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const todayStr = today();
    const daysFromStart = getCalendarDaysBetween(startDate, todayStr) - 1;
    const todayPosition = Math.max(0, daysFromStart) * dayWidth;
    
    // Center today's position in the view
    const containerWidth = scrollContainerRef.current.clientWidth;
    const scrollPosition = todayPosition - (containerWidth / 2);
    
    scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
  }, [startDate, dayWidth]); // Only run when these dependencies change

  const parseTaskDate = (dateStr: string): DateString => {
    try {
      // Handle invalid or empty date strings
      if (!dateStr || dateStr === 'Invalid Date') {
        console.warn('Invalid date in Timeline, using today:', dateStr);
        return addDays(startDate, 0); // Use timeline start as fallback
      }
      
      // Extract just the date part (YYYY-MM-DD) and validate
      const datePart = dateStr.split('T')[0].split(' ')[0];
      if (!datePart || datePart.length < 10) {
        console.warn('Invalid date part in Timeline:', dateStr);
        return addDays(startDate, 0);
      }
      
      return datePart;
    } catch (error) {
      console.error('Error parsing date in Timeline:', dateStr, error);
      return addDays(startDate, 0);
    }
  };

  const getTaskPosition = (task: ProjectTask) => {
    try {
      // Validate task dates before processing
      if (!task.start_date || !task.end_date) {
        console.warn('Task missing dates:', task.task_name);
        return { left: 0, width: 40, progress: task.progress || 0 };
      }
      
      const taskStartDate = parseTaskDate(task.start_date);
      
      // Calculate calendar days from timeline start to task start for positioning
      const daysFromStart = getCalendarDaysBetween(startDate, taskStartDate) - 1; // -1 because we want 0-based index
      
      // Calculate correct end date based on duration (inclusive calculation)
      const taskDuration = task.duration || 1;
      const correctEndDate = calculateBusinessEndDate(taskStartDate, taskDuration);
      
      // Calculate calendar days between task start and correct end (inclusive)
      const widthDays = getCalendarDaysBetween(taskStartDate, correctEndDate);
      
      return {
        left: Math.max(0, daysFromStart) * dayWidth, // Ensure non-negative position
        width: Math.max(dayWidth, widthDays * dayWidth), // Ensure minimum width
        progress: task.progress || 0
      };
    } catch (error) {
      console.error('Error calculating task position:', task.task_name, error);
      return { left: 0, width: 40, progress: task.progress || 0 };
    }
  };

  // Helper function to check if a task has children based on hierarchy
  const hasChildren = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.hierarchy_number) return false;
    
    return tasks.some(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(task.hierarchy_number + ".") &&
      t.hierarchy_number.split(".").length === task.hierarchy_number.split(".").length + 1
    );
  };

  // Filter tasks based on expansion state using hierarchy numbers
  const getVisibleTasks = () => {
    const visibleTasks: ProjectTask[] = [];
    
    for (const task of sortedTasks) {
      if (!task.hierarchy_number) {
        visibleTasks.push(task);
        continue;
      }
      
      // Always show root tasks (no dots in hierarchy)
      if (!task.hierarchy_number.includes(".")) {
        visibleTasks.push(task);
        continue;
      }
      
      // For nested tasks, check if all parent levels would be expanded
      // Note: We don't have access to the expandedTasks state here, so we'll show all for now
      // This should be synchronized with the TaskTable's visibility logic
      visibleTasks.push(task);
    }
    
    return visibleTasks;
  };

  // Sort tasks by hierarchy number for display
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  const visibleTasks = getVisibleTasks();

  // Function to generate dependency connections
  const generateDependencyConnections = () => {
    const connections: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      fromTaskName: string;
      toTaskName: string;
    }[] = [];

    visibleTasks.forEach((task, taskIndex) => {
      // Handle predecessor field - it can be string[], string, or JSON string
      let predecessorList: string[] = [];
      
      if (Array.isArray(task.predecessor)) {
        predecessorList = task.predecessor;
      } else if (task.predecessor) {
        try {
          // Try to parse as JSON first (e.g., "[\"1\"]")
          const parsed = JSON.parse(task.predecessor);
          predecessorList = Array.isArray(parsed) ? parsed : [task.predecessor];
        } catch {
          // If not JSON, treat as single string
          predecessorList = [task.predecessor];
        }
      }
      
      if (!predecessorList.length) return;

      const taskPosition = getTaskPosition(task);
      const toY = taskIndex * 32 + 16; // Center of task bar
      const toX = taskPosition.left;

      // Parse predecessors
      const parsedPreds = parsePredecessors(predecessorList, tasks);
      
      parsedPreds.forEach(pred => {
        if (!pred.isValid) return;

        // Find predecessor task in visible tasks
        const predTask = visibleTasks.find(t => t.hierarchy_number === pred.taskId);
        if (!predTask) return;

        const predIndex = visibleTasks.indexOf(predTask);
        const predPosition = getTaskPosition(predTask);
        
        const fromY = predIndex * 32 + 16; // Center of predecessor bar
        const fromX = predPosition.left + predPosition.width; // End of predecessor bar

        connections.push({
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY },
          fromTaskName: predTask.task_name || '',
          toTaskName: task.task_name || ''
        });
      });
    });

    return connections;
  };

  const connections = generateDependencyConnections();

  return (
    <div ref={scrollContainerRef} className="h-full overflow-auto">
      {/* Timeline Header */}
      <TimelineHeader
        startDate={startDate}
        endDate={endDate}
        dayWidth={dayWidth}
        timelineWidth={timelineWidth}
      />

      {/* Timeline Content */}
      <div className="relative" style={{ width: timelineWidth }}>
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {dayWidth <= 12 ? (
            // Weekly grid lines - show lines at weekly boundaries
            (() => {
              // Generate month boundaries for weekly grid
              const months: { name: string; width: number; left: number }[] = [];
              let currentMonthStart = 0;
              let currentMonth = "";
              
              for (let day = 0; day < safeTotalDays; day++) {
                const dayDate = addDays(startDate, day);
                const monthName = `${dayDate.split('-')[0]}-${dayDate.split('-')[1]}`;
                
                if (monthName !== currentMonth || day === safeTotalDays - 1) {
                  if (currentMonth !== "") {
                    const dayCount = day === safeTotalDays - 1 ? day - currentMonthStart + 1 : day - currentMonthStart;
                    months.push({
                      name: currentMonth,
                      width: dayCount * dayWidth,
                      left: currentMonthStart * dayWidth
                    });
                  }
                  currentMonth = monthName;
                  currentMonthStart = day;
                }
              }
              
              // Add final month if needed
              if (currentMonthStart < safeTotalDays) {
                months.push({
                  name: currentMonth,
                  width: (safeTotalDays - currentMonthStart) * dayWidth,
                  left: currentMonthStart * dayWidth
                });
              }
              
              return months.flatMap(month => {
                const weekWidth = month.width / 4;
                return [0, 1, 2, 3, 4].map(weekNum => (
                  <div
                    key={`${month.name}-week-${weekNum}`}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: month.left + weekNum * weekWidth }}
                  />
                ));
              });
            })()
          ) : (
            // Daily grid lines
            Array.from({ length: safeTotalDays }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-border/30"
                style={{ left: i * dayWidth }}
              />
            ))
          )}
        </div>

        {/* Dependency Wires */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: timelineWidth, height: visibleTasks.length * 32 }}
        >
          {connections.map((connection, index) => {
            const { from, to } = connection;
            
            // Calculate complex orthogonal path: right, down longer, left longer, down, right
            const rightOffset = 10; // Distance to go right from predecessor
            const leftOffset = 23;  // Distance to go left in middle section (115% of previous)
            const rightTurnX = from.x + rightOffset;
            const intermediateY = from.y + (to.y - from.y) * 0.47; // 90% of previous value (higher position)
            const leftTurnX = rightTurnX - leftOffset;
            
            // Create stepped path
            const pathData = `M ${from.x} ${from.y} 
                             L ${rightTurnX} ${from.y} 
                             L ${rightTurnX} ${intermediateY}
                             L ${leftTurnX} ${intermediateY}
                             L ${leftTurnX} ${to.y}
                             L ${to.x} ${to.y}`;

            return (
              <g key={`${connection.fromTaskName}-${connection.toTaskName}-${index}`}>
                {/* Connection path */}
                <path
                  d={pathData}
                  stroke="black"
                  strokeWidth="1"
                  fill="none"
                />
                {/* Arrow head pointing right into successor task */}
                <polygon
                  points={`${to.x - 8},${to.y - 4} ${to.x},${to.y} ${to.x - 8},${to.y + 4}`}
                  fill="black"
                />
              </g>
            );
          })}
        </svg>

        {/* Task Bars - Now properly aligned */}
        <div className="relative">
          {visibleTasks.map((task, index) => {
            const position = getTaskPosition(task);
            return (
              <TimelineBar
                key={task.id}
                task={task}
                position={position}
                rowIndex={index}
                rowHeight={32} // Matches table row height exactly
                onTaskUpdate={onTaskUpdate}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}