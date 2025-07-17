import React, { useEffect, useRef } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

interface Task {
  id: string;
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  assigned_to?: string;
  dependencies: string[];
  color: string;
  parent_id?: string;
  order_index: number;
}

interface DHtmlxGanttChartProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function DHtmlxGanttChart({ tasks, onTaskUpdate, onTaskDelete }: DHtmlxGanttChartProps) {
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ganttRef.current) return;

    // Basic DHTMLX Gantt configuration
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    
    // Grid columns
    gantt.config.columns = [
      { name: "text", label: "Task Name", tree: true, width: 200 },
      { name: "start_date", label: "Start", align: "center", width: 100 },
      { name: "duration", label: "Duration", align: "center", width: 80 },
      { name: "add", label: "", width: 44 }
    ];

    // Basic settings
    gantt.config.show_progress = true;
    gantt.config.grid_resize = true;

    // Event handlers
    gantt.attachEvent("onAfterTaskUpdate", (id: string, task: any) => {
      if (onTaskUpdate) {
        const updates: Partial<Task> = {
          task_name: task.text,
          start_date: gantt.date.date_to_str("%Y-%m-%d")(task.start_date),
          end_date: gantt.date.date_to_str("%Y-%m-%d")(task.end_date),
          duration: task.duration,
          progress: Math.round(task.progress * 100),
          assigned_to: task.assigned_to
        };
        onTaskUpdate(id, updates);
      }
    });

    gantt.attachEvent("onBeforeTaskDelete", (id: string) => {
      if (onTaskDelete) {
        onTaskDelete(id);
      }
      return false;
    });

    // Initialize
    gantt.init(ganttRef.current);

    return () => {
      gantt.clearAll();
    };
  }, [onTaskUpdate, onTaskDelete]);

  useEffect(() => {
    // Update data
    const ganttData = {
      data: tasks.map(task => ({
        id: task.id,
        text: task.task_name,
        start_date: task.start_date,
        duration: task.duration,
        progress: task.progress / 100,
        parent: task.parent_id || 0
      })),
      links: []
    };

    gantt.clearAll();
    gantt.parse(ganttData);
  }, [tasks]);

  return (
    <div 
      ref={ganttRef} 
      style={{ width: '100%', height: '500px' }}
      className="gantt-container"
    />
  );
}