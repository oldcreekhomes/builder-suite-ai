import React from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBar } from "./TimelineBar";
import { isBusinessDay, getBusinessDaysBetween } from "@/utils/businessDays";

interface TimelineProps {
  tasks: ProjectTask[];
  startDate: Date;
  endDate: Date;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

export function Timeline({ tasks, startDate, endDate, onTaskUpdate }: TimelineProps) {
  // Calculate timeline width with hard limits for performance
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Hard guard: Cap total days to prevent performance issues
  const maxDays = 1095; // 3 years worth of days
  const safeTotalDays = Math.min(totalDays, maxDays);
  
  const dayWidth = 40; // pixels per day
  const timelineWidth = safeTotalDays * dayWidth;
  
  if (totalDays > maxDays) {
    console.warn(`⚠️ Timeline capped at ${maxDays} days for performance (was ${totalDays} days)`);
  }

  const parseDate = (dateStr: string): Date => {
    try {
      // Handle invalid or empty date strings
      if (!dateStr || dateStr === 'Invalid Date') {
        return new Date(); // Return current date as fallback
      }
      
      // Extract just the date part (YYYY-MM-DD) and validate
      const datePart = dateStr.split('T')[0].split(' ')[0];
      if (!datePart || datePart.length < 10) {
        console.warn('Invalid date part in Timeline:', dateStr);
        return new Date();
      }
      
      const date = new Date(datePart + "T12:00:00");
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in Timeline:', dateStr);
        return new Date();
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing date in Timeline:', dateStr, error);
      return new Date();
    }
  };

  const getTaskPosition = (task: ProjectTask) => {
    try {
      // Validate task dates before processing
      if (!task.start_date || !task.end_date) {
        console.warn('Task missing dates:', task.task_name);
        return { left: 0, width: 40, progress: task.progress || 0 };
      }
      
      const taskStart = parseDate(task.start_date);
      const taskEnd = parseDate(task.end_date);
      
      // Validate parsed dates
      if (isNaN(taskStart.getTime()) || isNaN(taskEnd.getTime())) {
        console.warn('Invalid task dates:', task.task_name, task.start_date, task.end_date);
        return { left: 0, width: 40, progress: task.progress || 0 };
      }
      
      // Calculate actual calendar days from timeline start to task start for positioning
      const daysFromStart = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate task width based on duration (business days) but show full calendar width
      const taskDuration = task.duration || 1;
      
      // Calculate actual calendar days between task start and end (exclusive end date)
      const msPerDay = 1000 * 60 * 60 * 24;
      const widthDays = Math.max(1, Math.floor((taskEnd.getTime() - taskStart.getTime()) / msPerDay) || 1);
      
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

  return (
    <div className="h-[600px] overflow-auto">
      {/* Timeline Header */}
      <TimelineHeader
        startDate={startDate}
        endDate={endDate}
        dayWidth={dayWidth}
        timelineWidth={timelineWidth}
      />

      {/* Timeline Content */}
      <div className="relative" style={{ width: timelineWidth }}>
        {/* Grid Lines - Use safeTotalDays */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: safeTotalDays }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-border/30"
              style={{ left: i * dayWidth }}
            />
          ))}
        </div>

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