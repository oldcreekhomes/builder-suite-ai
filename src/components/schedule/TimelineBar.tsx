import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface TimelineBarProps {
  task: ProjectTask;
  position: {
    left: number;
    width: number;
    progress: number;
  };
  rowHeight: number;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

export function TimelineBar({ task, position, rowHeight, onTaskUpdate }: TimelineBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const getBarColor = (hierarchyNumber: string) => {
    if (!hierarchyNumber) return "hsl(var(--primary))";
    
    const level = hierarchyNumber.split(".").length;
    const colors = [
      "hsl(var(--primary))",     // Level 1
      "hsl(var(--secondary))",   // Level 2
      "hsl(var(--accent))",      // Level 3
      "hsl(var(--muted))",       // Level 4+
    ];
    
    return colors[Math.min(level - 1, colors.length - 1)];
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

  const barColor = getBarColor(task.hierarchy_number || "");
  const progressWidth = (position.width * position.progress) / 100;

  return (
    <div
      className="relative"
      style={{
        height: rowHeight,
        marginBottom: 1
      }}
    >
      {/* Task Bar */}
      <div
        className={`absolute top-2 h-8 rounded cursor-move border border-border/50 ${
          isDragging ? "opacity-70" : ""
        }`}
        style={{
          left: position.left,
          width: position.width,
          backgroundColor: barColor + "40", // 40 for alpha
          borderColor: barColor
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Progress Fill */}
        <div
          className="h-full rounded-l"
          style={{
            width: progressWidth,
            backgroundColor: barColor,
            opacity: 0.8
          }}
        />
        
        {/* Task Name Overlay */}
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-xs font-medium text-foreground truncate">
            {task.task_name}
          </span>
        </div>
        
        {/* Progress Text */}
        {position.progress > 0 && (
          <div className="absolute right-1 top-1 text-xs text-foreground/70">
            {position.progress}%
          </div>
        )}
      </div>
    </div>
  );
}