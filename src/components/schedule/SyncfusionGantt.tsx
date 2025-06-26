
import React from "react";
import { Gantt, Task, EventOption, StylingOption, ViewMode, DisplayOption } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface SyncfusionGanttProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function SyncfusionGantt({ tasks, onTaskUpdate, projectId }: SyncfusionGanttProps) {
  // Transform our tasks to gantt-task-react format
  const ganttTasks: Task[] = tasks.map((task, index) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    
    // Ensure valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(`Invalid dates for task ${task.task_name}`);
      // Use fallback dates
      const fallbackStart = new Date();
      const fallbackEnd = new Date(fallbackStart.getTime() + 24 * 60 * 60 * 1000); // 1 day later
      
      return {
        start: fallbackStart,
        end: fallbackEnd,
        name: task.task_name || `Task ${index + 1}`,
        id: task.id,
        type: 'task',
        progress: Math.min(100, Math.max(0, task.progress || 0)),
        isDisabled: false,
      };
    }

    return {
      start: startDate,
      end: endDate,
      name: task.task_name || `Task ${index + 1}`,
      id: task.id,
      type: 'task',
      progress: Math.min(100, Math.max(0, task.progress || 0)),
      isDisabled: false,
    };
  });

  // Handle task changes
  const handleTaskChange = (task: Task) => {
    console.log("Task changed:", task);
    onTaskUpdate();
  };

  const handleTaskDelete = (task: Task) => {
    console.log("Task deleted:", task);
    onTaskUpdate();
  };

  const handleProgressChange = (task: Task) => {
    console.log("Progress changed:", task);
    onTaskUpdate();
  };

  const handleDblClick = (task: Task) => {
    console.log("Task double clicked:", task);
  };

  // Show loading state if no valid tasks
  if (ganttTasks.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No valid tasks to display</p>
          <p className="text-sm text-gray-500">Add tasks with valid dates to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <div className="w-full h-full rounded-lg border border-gray-200 overflow-hidden">
        <Gantt
          tasks={ganttTasks}
          viewMode={ViewMode.Day}
          onDateChange={handleTaskChange}
          onDelete={handleTaskDelete}
          onProgressChange={handleProgressChange}
          onDoubleClick={handleDblClick}
          listCellWidth="250px"
          columnWidth={60}
          rowHeight={50}
        />
      </div>
    </div>
  );
}
