import React from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineBar } from "./TimelineBar";

interface TimelineProps {
  tasks: ProjectTask[];
  startDate: Date;
  endDate: Date;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

export function Timeline({ tasks, startDate, endDate, onTaskUpdate }: TimelineProps) {
  // Calculate timeline width and positioning
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayWidth = 40; // pixels per day
  const timelineWidth = totalDays * dayWidth;

  const getTaskPosition = (task: ProjectTask) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    
    const startOffset = Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
      progress: task.progress || 0
    };
  };

  // Sort tasks by hierarchy number for display
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

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

        {/* Task Bars */}
        <div className="space-y-1">
          {sortedTasks.map((task, index) => {
            const position = getTaskPosition(task);
            return (
              <TimelineBar
                key={task.id}
                task={task}
                position={position}
                rowHeight={53} // Matches table row height
                onTaskUpdate={onTaskUpdate}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}