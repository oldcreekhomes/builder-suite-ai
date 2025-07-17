import React, { useEffect, useRef, useCallback } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { toast } from 'sonner';

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
  onTaskCreate?: (taskData: Partial<Task>) => Promise<void>;
}

export function DHtmlxGanttChart({ tasks, onTaskUpdate, onTaskDelete, onTaskCreate }: DHtmlxGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  const handleTaskAction = useCallback(async (type: string, action: string, item: any, id: string) => {
    try {
      if (action === "delete" && onTaskDelete) {
        await onTaskDelete(id);
        toast.success("Task deleted successfully");
      } else if (action === "create" && onTaskCreate) {
        const taskData: Partial<Task> = {
          task_name: item.text,
          start_date: gantt.date.date_to_str("%Y-%m-%d")(item.start_date),
          end_date: gantt.date.date_to_str("%Y-%m-%d")(item.end_date),
          duration: item.duration,
          progress: Math.round((item.progress || 0) * 100),
          assigned_to: item.assigned_to || "",
          color: item.color || "#3b82f6",
          parent_id: item.parent || null
        };
        await onTaskCreate(taskData);
        toast.success("Task created successfully");
      } else if (action === "update" && onTaskUpdate) {
        const updates: Partial<Task> = {
          task_name: item.text,
          start_date: gantt.date.date_to_str("%Y-%m-%d")(item.start_date),
          end_date: gantt.date.date_to_str("%Y-%m-%d")(item.end_date),
          duration: item.duration,
          progress: Math.round((item.progress || 0) * 100),
          assigned_to: item.assigned_to || ""
        };
        await onTaskUpdate(id, updates);
        toast.success("Task updated successfully");
      }
    } catch (error) {
      console.error("Task action failed:", error);
      toast.error(`Failed to ${action} task`);
      return { status: "error" };
    }
    return { status: "success" };
  }, [onTaskUpdate, onTaskDelete, onTaskCreate]);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;

    // Completely disable all auto-resize features to prevent infinite loops
    gantt.config.auto_resize = false;
    gantt.config.fit_tasks = false;
    
    // Configure Gantt before initialization
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    gantt.config.duration_unit = "day";
    
    // Disable problematic features that trigger resizing
    gantt.config.drag_progress = false;
    gantt.config.drag_resize = false;
    gantt.config.drag_links = false;
    gantt.config.drag_move = false;
    
    // Grid configuration - fixed sizes
    gantt.config.grid_resize = false;
    gantt.config.row_height = 40;
    gantt.config.task_height = 24;
    gantt.config.bar_height = 20;
    
    // Configure columns
    gantt.config.columns = [
      { 
        name: "text", 
        label: "Task Name", 
        tree: true, 
        width: 250
      },
      { 
        name: "start_date", 
        label: "Start Date", 
        width: 120, 
        align: "center"
      },
      { 
        name: "duration", 
        label: "Duration", 
        width: 80, 
        align: "center"
      },
      { 
        name: "progress", 
        label: "Progress", 
        width: 80, 
        align: "center",
        template: (task: any) => Math.round((task.progress || 0) * 100) + "%"
      },
      { 
        name: "assigned_to", 
        label: "Assignee", 
        width: 120, 
        align: "center"
      },
      { name: "add", label: "", width: 44 }
    ];

    // Enable progress display
    gantt.config.show_progress = true;
    gantt.config.show_task_cells = true;
    
    // Disable auto-scheduling to prevent layout thrashing
    gantt.config.auto_scheduling = false;
    
    // Configure task colors
    gantt.templates.task_class = (start, end, task) => {
      return task.color ? "gantt_task_custom" : "";
    };
    
    gantt.templates.task_row_class = (start, end, task) => {
      return task.parent ? "gantt_child_row" : "gantt_parent_row";
    };

    // Configure links (dependencies) - simplified
    gantt.config.link_wrapper_width = 20;
    gantt.config.link_line_width = 2;
    
    // Initialize Gantt with fixed dimensions
    gantt.init(containerRef.current);
    
    // Force a specific size to prevent auto-resizing
    gantt.setSizes();
    
    // Set up data processor
    const dataProcessor = gantt.createDataProcessor(handleTaskAction);
    dataProcessor.init(gantt);
    
    // Add event handlers
    gantt.attachEvent("onTaskDblClick", (id) => {
      gantt.showLightbox(id);
      return false;
    });

    // Custom lightbox configuration
    gantt.config.lightbox.sections = [
      { name: "description", height: 38, map_to: "text", type: "textarea", focus: true },
      { name: "assigned_to", height: 22, map_to: "assigned_to", type: "textarea" },
      { name: "time", type: "duration", map_to: "auto" }
    ];

    isInitialized.current = true;

    // Cleanup function
    return () => {
      if (dataProcessor) {
        dataProcessor.destructor();
      }
      gantt.clearAll();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      isInitialized.current = false;
    };
  }, [handleTaskAction]);

  // Update data when tasks change - but don't re-init
  useEffect(() => {
    if (!isInitialized.current || !tasks) return;

    const ganttData = {
      data: tasks.map(task => ({
        id: task.id,
        text: task.task_name,
        start_date: new Date(task.start_date),
        duration: task.duration,
        progress: (task.progress || 0) / 100,
        parent: task.parent_id || 0,
        assigned_to: task.assigned_to || "",
        color: task.color || "#3b82f6"
      })),
      links: tasks
        .filter(task => task.dependencies && task.dependencies.length > 0)
        .flatMap(task => 
          task.dependencies.map((depId, index) => ({
            id: `${task.id}_${depId}_${index}`,
            source: depId,
            target: task.id,
            type: "0"
          }))
        )
    };

    // Clear and reload data without re-initializing
    gantt.clearAll();
    gantt.parse(ganttData);
    
    // Force layout refresh without auto-resize
    setTimeout(() => {
      gantt.render();
    }, 10);
  }, [tasks]);

  return (
    <div className="gantt-wrapper">
      <style>{`
        .gantt_task_custom .gantt_task_content {
          background-color: var(--color, #3b82f6) !important;
          border-color: var(--color, #3b82f6) !important;
        }
        .gantt_child_row {
          background-color: #f8fafc;
        }
        .gantt_child_cell {
          padding-left: 40px;
        }
        .gantt_grid_scale .gantt_grid_head_cell {
          background: #f1f5f9;
          border-color: #e2e8f0;
        }
        .gantt_task_line {
          border-radius: 4px;
        }
        .gantt_task_progress {
          border-radius: 4px;
        }
        .gantt_link_arrow {
          color: #64748b;
        }
        .gantt_link_line {
          background-color: #64748b;
        }
        /* Prevent resize loops */
        .gantt_layout_cell {
          max-width: 100% !important;
          overflow: hidden !important;
        }
        .gantt_container {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
      <div 
        ref={containerRef} 
        style={{ 
          width: "100%", 
          height: "600px",
          maxWidth: "100%",
          overflow: "hidden"
        }}
        className="gantt-container border border-border rounded-lg bg-background"
      />
    </div>
  );
}