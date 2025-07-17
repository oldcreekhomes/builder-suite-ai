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
  const dataProcessorRef = useRef<any>(null);

  useEffect(() => {
    if (!ganttRef.current) return;

    // Basic configuration following DHTMLX official React guide
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    
    // Grid columns configuration
    gantt.config.columns = [
      { name: "text", label: "Task Name", tree: true, width: 200 },
      { name: "start_date", label: "Start", align: "center", width: 100 },
      { name: "duration", label: "Duration", align: "center", width: 80 },
      { name: "progress", label: "Progress", align: "center", width: 80 },
      { name: "add", label: "", width: 44 }
    ];

    // Enable basic features
    gantt.config.show_progress = true;
    gantt.config.grid_resize = true;

    // Initialize data processor for handling updates
    if (onTaskUpdate || onTaskDelete) {
      dataProcessorRef.current = gantt.createDataProcessor((entityType: string, action: string, item: any, id: string) => {
        return new Promise((resolve) => {
          if (action === "delete" && onTaskDelete) {
            onTaskDelete(id);
          } else if ((action === "update" || action === "create") && onTaskUpdate) {
            const updates: Partial<Task> = {
              task_name: item.text,
              start_date: gantt.date.date_to_str("%Y-%m-%d")(item.start_date),
              end_date: gantt.date.date_to_str("%Y-%m-%d")(item.end_date),
              duration: item.duration,
              progress: Math.round(item.progress * 100),
              assigned_to: item.assigned_to
            };
            onTaskUpdate(id, updates);
          }
          resolve(undefined);
        });
      });
    }

    // Initialize gantt
    gantt.init(ganttRef.current);

    return () => {
      if (dataProcessorRef.current) {
        dataProcessorRef.current.destructor();
        dataProcessorRef.current = null;
      }
      gantt.clearAll();
    };
  }, [onTaskUpdate, onTaskDelete]);

  useEffect(() => {
    // Transform and load data
    const ganttData = {
      data: tasks.map(task => ({
        id: task.id,
        text: task.task_name,
        start_date: task.start_date,
        duration: task.duration,
        progress: task.progress / 100, // Convert 0-100 to 0-1
        parent: task.parent_id || 0
      })),
      links: [] // Add dependency links when needed
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