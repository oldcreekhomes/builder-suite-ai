import React, { useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { Button } from '@/components/ui/button';
import { CalendarDays, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface ScheduleTask {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  progress: number;
  assigned_to?: string;
  color: string;
  duration?: number;
}

interface ReactGanttChartProps {
  tasks: ScheduleTask[];
  onTaskUpdate?: (taskId: string, updates: Partial<ScheduleTask>) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function ReactGanttChart({ tasks, onTaskUpdate, onTaskDelete }: ReactGanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

  const ganttTasks: Task[] = useMemo(() => {
    return tasks.map((task) => ({
      start: new Date(task.start_date),
      end: new Date(task.end_date),
      name: task.task_name,
      id: task.id,
      progress: task.progress || 0,
      type: 'task' as const,
      dependencies: [],
      hideChildren: false,
      styles: {
        backgroundColor: task.color,
        backgroundSelectedColor: task.color,
        progressColor: '#ffffff50',
        progressSelectedColor: '#ffffff50',
      }
    }));
  }, [tasks]);

  const handleTaskChange = (task: Task) => {
    const originalTask = tasks.find(t => t.id === task.id);
    if (!originalTask || !onTaskUpdate) return;

    onTaskUpdate(task.id, {
      start_date: task.start.toISOString().split('T')[0],
      end_date: task.end.toISOString().split('T')[0],
      progress: task.progress,
    });
  };

  const handleTaskDelete = (task: Task) => {
    if (onTaskDelete) {
      onTaskDelete(task.id);
    }
  };

  const getViewModeDisplay = (mode: ViewMode) => {
    switch (mode) {
      case ViewMode.Day: return 'Day';
      case ViewMode.Week: return 'Week';
      case ViewMode.Month: return 'Month';
      default: return 'Week';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="w-full h-[600px] border border-border rounded-lg bg-background flex items-center justify-center">
        <div className="text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No tasks found</h3>
          <p className="text-muted-foreground">Create your first task to get started with project scheduling.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(ViewMode.Day)}
            className={viewMode === ViewMode.Day ? 'bg-primary text-primary-foreground' : ''}
          >
            Day
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(ViewMode.Week)}
            className={viewMode === ViewMode.Week ? 'bg-primary text-primary-foreground' : ''}
          >
            Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(ViewMode.Month)}
            className={viewMode === ViewMode.Month ? 'bg-primary text-primary-foreground' : ''}
          >
            Month
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Viewing: {getViewModeDisplay(viewMode)}
        </div>
      </div>

      <div className="w-full h-[600px] border border-border rounded-lg bg-background overflow-hidden">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleTaskChange}
          onProgressChange={handleTaskChange}
          onDelete={handleTaskDelete}
          listCellWidth=""
          columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 200 : 100}
          TooltipContent={({ task }) => (
            <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md border max-w-xs">
              <div className="font-semibold mb-1">{task.name}</div>
              <div className="text-sm space-y-1">
                <div>Start: {task.start.toLocaleDateString()}</div>
                <div>End: {task.end.toLocaleDateString()}</div>
                <div>Progress: {task.progress}%</div>
                {tasks.find(t => t.id === task.id)?.assigned_to && (
                  <div>Assigned: {tasks.find(t => t.id === task.id)?.assigned_to}</div>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}