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
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!ganttRef.current || isInitialized.current) return;

    // Configure DHTMLX Gantt
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    gantt.config.auto_scheduling = true;
    gantt.config.auto_scheduling_strict = true;
    gantt.config.work_time = true;
    gantt.config.correct_work_time = true;
    
    // Configure columns
    gantt.config.columns = [
      { name: "text", label: "Task Name", width: 200, tree: true },
      { name: "start_date", label: "Start Date", width: 100, align: "center" },
      { name: "duration", label: "Duration", width: 80, align: "center" },
      { name: "progress", label: "Progress", width: 80, align: "center" },
      { name: "assigned_to", label: "Assigned To", width: 120, align: "center" }
    ];

    // Configure progress display
    gantt.config.show_progress = true;
    gantt.config.order_branch = true;
    gantt.config.order_branch_free = true;

    // Event handlers
    gantt.attachEvent("onAfterTaskUpdate", (id: string, task: any) => {
      if (onTaskUpdate) {
        const updates: Partial<Task> = {
          task_name: task.text,
          start_date: gantt.date.date_to_str("%Y-%m-%d")(task.start_date),
          end_date: gantt.date.date_to_str("%Y-%m-%d")(task.end_date),
          duration: task.duration,
          progress: task.progress * 100, // DHTMLX uses 0-1, we use 0-100
          assigned_to: task.assigned_to
        };
        onTaskUpdate(id, updates);
      }
    });

    gantt.attachEvent("onBeforeTaskDelete", (id: string) => {
      if (onTaskDelete) {
        onTaskDelete(id);
      }
      return false; // Prevent default deletion, handle via React
    });

    // Initialize gantt only once
    gantt.init(ganttRef.current);
    isInitialized.current = true;

    return () => {
      if (isInitialized.current) {
        gantt.clearAll();
        isInitialized.current = false;
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  useEffect(() => {
    if (!isInitialized.current) return;

    // Transform data for DHTMLX Gantt
    const ganttData = {
      data: tasks.map(task => ({
        id: task.id,
        text: task.task_name,
        start_date: task.start_date,
        end_date: task.end_date,
        duration: task.duration,
        progress: task.progress / 100, // Convert 0-100 to 0-1
        assigned_to: task.assigned_to || '',
        parent: task.parent_id || '',
        color: task.color,
        sortorder: task.order_index
      })),
      links: [] // We'll add dependency links here when needed
    };

    // Clear and re-parse data
    gantt.clearAll();
    gantt.parse(ganttData);
  }, [tasks]);

  return (
    <div className="w-full">
      <div 
        ref={ganttRef} 
        style={{ width: '100%', height: '600px' }}
        className="dhtmlx-gantt-container"
      />
    </div>
  );
}