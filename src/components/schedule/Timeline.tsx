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
  // Calculate timeline width and positioning
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayWidth = 40; // pixels per day
  const timelineWidth = totalDays * dayWidth;

  const parseDate = (dateStr: string): Date => {
    // Extract just the date part (YYYY-MM-DD) and use the same logic as TaskRow
    const datePart = dateStr.split('T')[0].split(' ')[0];
    return new Date(datePart + "T12:00:00");
  };

  const getTaskPosition = (task: ProjectTask) => {
    const taskStart = parseDate(task.start_date);
    const taskEnd = parseDate(task.end_date);
    
    // Calculate actual calendar days from timeline start to task start for positioning
    const daysFromStart = Math.floor((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate task width based on duration (business days) but show full calendar width
    const taskDuration = task.duration || 1;
    
    // Calculate actual calendar days between task start and end
    const calendarDaysWidth = Math.floor((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      left: daysFromStart * dayWidth,
      width: calendarDaysWidth * dayWidth, // Show full calendar width including weekends
      progress: task.progress || 0
    };
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
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: totalDays }, (_, i) => (
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