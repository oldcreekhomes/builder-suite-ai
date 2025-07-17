import React, { useState, useMemo } from 'react';
import { Gantt, Task, ViewMode, StylingOption } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ReactGanttChartProps {
  tasks: any[];
  onCreateTask: (taskData: any) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateLink: (linkData: any) => void;
  onDeleteLink: (linkId: string) => void;
  isLoading?: boolean;
}

export function ReactGanttChart({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateLink,
  onDeleteLink,
  isLoading = false
}: ReactGanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  // Convert tasks to Gantt format
  const ganttTasks: Task[] = useMemo(() => {
    return tasks.map(task => ({
      start: new Date(task.start_date),
      end: new Date(task.end_date),
      name: task.task_name,
      id: task.id,
      type: task.task_type === 'milestone' ? 'milestone' : 'task',
      progress: task.progress || 0,
      isDisabled: false,
      styles: {
        backgroundColor: task.color || '#3b82f6',
        backgroundSelectedColor: task.color ? `${task.color}dd` : '#2563eb',
        progressColor: '#1d4ed8',
        progressSelectedColor: '#1e40af'
      }
    }));
  }, [tasks]);

  const handleTaskChange = (task: Task) => {
    onUpdateTask(task.id, {
      start_date: format(task.start, 'yyyy-MM-dd'),
      end_date: format(task.end, 'yyyy-MM-dd'),
      task_name: task.name,
      progress: task.progress
    });
  };

  const handleTaskDelete = (task: Task) => {
    onDeleteTask(task.id);
  };

  const handleAddTask = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    onCreateTask({
      task_name: 'New Task',
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(tomorrow, 'yyyy-MM-dd'),
      duration: 1,
      progress: 0,
      task_type: 'task',
      color: '#3b82f6'
    });
  };

  const handleExportToPDF = () => {
    window.print();
  };

  const ganttStyling: StylingOption = {
    headerHeight: 50,
    columnWidth: 100,
    listCellWidth: '200px',
    rowHeight: 50,
    ganttHeight: 600,
    barBackgroundColor: '#3b82f6',
    barBackgroundSelectedColor: '#2563eb',
    arrowColor: '#6b7280',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b bg-card">
        <Button onClick={handleAddTask} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
        
        <div className="flex items-center gap-1 ml-4">
          <Button
            variant={viewMode === ViewMode.Day ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(ViewMode.Day)}
          >
            Day
          </Button>
          <Button
            variant={viewMode === ViewMode.Week ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(ViewMode.Week)}
          >
            Week
          </Button>
          <Button
            variant={viewMode === ViewMode.Month ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(ViewMode.Month)}
          >
            Month
          </Button>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportToPDF} className="gap-2 ml-4">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Gantt Chart */}
      <div className="gantt-container">
        {ganttTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-sm mb-4">Create your first task to get started</p>
            <Button onClick={handleAddTask} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        ) : (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleTaskChange}
            onDoubleClick={(task) => {
              // Handle task editing
              console.log('Edit task:', task);
            }}
            {...ganttStyling}
          />
        )}
      </div>

      <style>{`
        .gantt-container {
          height: calc(100vh - 200px);
        }
        
        .gantt-table {
          font-family: Inter, sans-serif;
        }
        
        .gantt-table-header {
          background-color: hsl(var(--card));
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .gantt-table-row {
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .gantt-table-row:hover {
          background-color: hsl(var(--muted));
        }
        
        .gantt-bar {
          border-radius: 4px;
        }
        
        .gantt-bar-progress {
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}