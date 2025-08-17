import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface TimelineBarProps {
  task: ProjectTask;
  position: {
    left: number;
    width: number;
    progress: number;
  };
  rowIndex: number;
  rowHeight: number;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

export function TimelineBar({ task, position, rowIndex, rowHeight, onTaskUpdate }: TimelineBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const getBarColorClass = (task: ProjectTask) => {
    // Check if task has confirmed status
    if (task.confirmed === false) {
      return "timeline-unconfirmed"; // Red for unconfirmed
    } else if (task.confirmed === true) {
      return "timeline-confirmed"; // Green for confirmed
    } else {
      return "timeline-default"; // Blue (default)
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Add global mouse move and up listeners
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new start date based on mouse position
      // This would require more complex logic to convert pixels back to dates
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const barColorClass = getBarColorClass(task);
  const progressWidth = (position.width * position.progress) / 100;

  return (
    <div
      className="absolute"
      style={{
        top: rowIndex * rowHeight,
        height: rowHeight,
        width: "100%"
      }}
    >
      {/* Task Bar */}
      <div
        className={`absolute h-6 rounded cursor-move border ${
          isDragging ? "opacity-70" : ""
        } bg-${barColorClass}/25 border-${barColorClass}`}
        style={{
          left: position.left,
          width: position.width,
          top: (rowHeight - 24) / 2, // Center the 24px bar in the row
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Progress Fill */}
        <div
          className={`h-full rounded-l bg-${barColorClass} opacity-80`}
          style={{
            width: progressWidth,
          }}
        />
        
        {/* Task Name Overlay */}
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-xs font-medium text-foreground truncate">
            {task.task_name}
          </span>
        </div>
      </div>
    </div>
  );
}