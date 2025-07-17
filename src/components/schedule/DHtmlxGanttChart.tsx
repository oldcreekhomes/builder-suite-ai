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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Gantt following DHTMLX official pattern
    gantt.init(containerRef.current);

    // Configure basic settings
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    
    // Enable grid resize
    gantt.config.grid_resize = true;
    
    // Configure columns
    gantt.config.columns = [
      { name: "text", label: "Task Name", tree: true, width: 200 },
      { name: "start_date", label: "Start Date", width: 100, align: "center" },
      { name: "duration", label: "Duration", width: 80, align: "center" },
      { name: "progress", label: "Progress", width: 80, align: "center" },
      { name: "add", label: "", width: 44 }
    ];

    // Enable progress display
    gantt.config.show_progress = true;

    // Initialize data processor for handling updates
    const dataProcessor = gantt.createDataProcessor((type: string, action: string, item: any, id: string) => {
      return new Promise<void>((resolve) => {
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
        resolve();
      });
    });

    // Parse initial data
    const ganttData = {
      data: tasks.map(task => ({
        id: task.id,
        text: task.task_name,
        start_date: task.start_date,
        duration: task.duration,
        progress: task.progress / 100, // Convert 0-100 to 0-1
        parent: task.parent_id || "",
        order: task.order_index
      })),
      links: [] // Add dependency links when needed
    };

    gantt.parse(ganttData);

    // Cleanup function
    return () => {
      if (dataProcessor) {
        dataProcessor.destructor();
      }
      gantt.clearAll();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tasks, onTaskUpdate, onTaskDelete]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: "100%", height: "500px" }}
      className="gantt-container"
    />
  );
}