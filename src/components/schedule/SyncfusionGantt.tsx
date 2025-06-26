
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
  const ganttTasks: Task[] = tasks.map((task, index) => ({
    start: new Date(task.start_date),
    end: new Date(task.end_date),
    name: task.task_name,
    id: task.id,
    type: 'task',
    progress: task.progress,
    isDisabled: false,
    styles: {
      backgroundColor: '#3b82f6',
      backgroundSelectedColor: '#1d4ed8',
      progressColor: '#22c55e',
      progressSelectedColor: '#16a34a',
    },
  }));

  const handleDateChange = (task: Task) => {
    console.log('Date changed:', task);
    onTaskUpdate();
  };

  const handleDelete = (task: Task) => {
    console.log('Task deleted:', task);
    onTaskUpdate();
  };

  const handleProgressChange = (task: Task) => {
    console.log('Progress changed:', task);
    onTaskUpdate();
  };

  const handleDoubleClick = (task: Task) => {
    console.log('Task double clicked:', task);
  };

  const handleClick = (task: Task) => {
    console.log('Task clicked:', task);
  };

  // Show loading state if no tasks
  if (tasks.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No tasks to display</p>
          <p className="text-sm text-gray-500">Add tasks to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full bg-white rounded-lg border overflow-hidden">
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Day}
        onDateChange={handleDateChange}
        onDelete={handleDelete}
        onProgressChange={handleProgressChange}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        listCellWidth="200px"
        columnWidth={60}
        rowHeight={50}
        barCornerRadius={3}
        handleWidth={8}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="14px"
        locale="en-US"
      />
    </div>
  );
}
