import { useRef, useEffect, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';

// Define task types for TypeScript
interface GanttTask {
  id: string;
  text: string;
  start_date: Date;
  end_date?: Date;
  duration?: number;
  progress?: number;
  parent?: string;
  open?: boolean;
  color?: string;
  textColor?: string;
  type?: string;
  render?: string;
  [key: string]: any;
}

interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: number | string;
  lag?: number;
}

export interface DHtmlxGanttProps {
  tasks: any[];
  dependencies?: any[];
  onCreateTask: (taskData: any) => Promise<void>;
  onUpdateTask: (taskId: string, updates: any) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateLink: (linkData: any) => Promise<void>;
  onDeleteLink: (linkId: string) => void;
  isLoading?: boolean;
}

export function DHtmlxGantt({
  tasks = [],
  dependencies = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateLink,
  onDeleteLink,
  isLoading = false
}: DHtmlxGanttProps) {
  const ganttContainer = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize gantt
  useEffect(() => {
    if (!ganttContainer.current) return;

    // Configure DHTMLX Gantt
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.duration_unit = "day";
    gantt.config.work_time = true;
    gantt.config.columns = [
      { name: "text", label: "Task name", tree: true, width: 200 },
      { name: "start_date", label: "Start", align: "center", width: 80 },
      { name: "duration", label: "Duration", align: "center", width: 50 },
      { name: "priority", label: "Priority", align: "center", width: 80 },
      { name: "add", label: "", width: 44 }
    ];

    // Enable all advanced features
    gantt.config.auto_scheduling = true;
    gantt.config.auto_scheduling_strict = true;
    gantt.config.auto_scheduling_compatibility = true;
    gantt.config.drag_links = true;
    gantt.config.drag_progress = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_move = true;
    gantt.config.open_tree_initially = true;
    gantt.config.row_height = 30;
    gantt.config.min_column_width = 30;
    gantt.config.scale_height = 60;
    gantt.config.work_time = true;
    gantt.config.correct_work_time = true;
    gantt.config.show_markers = true;
    gantt.config.show_task_cells = true;
    gantt.config.show_errors = true;
    gantt.config.fit_tasks = true;
    gantt.config.resource_render_empty_cells = true;

    // Configure scales for better time visualization
    gantt.config.scales = [
      { unit: "month", step: 1, format: "%F, %Y" },
      { unit: "week", step: 1, format: "Week #%W" },
      { unit: "day", step: 1, format: "%d %M", css: function(date: Date) { return (!gantt.isWorkTime(date) ? "weekend" : ""); } }
    ];

    // Configure lightbox (task edit form)
    gantt.config.lightbox.sections = [
      { name: "description", height: 38, map_to: "text", type: "textarea", focus: true },
      { name: "type", height: 22, map_to: "type", type: "select", options: [
        { key: "task", label: "Task" },
        { key: "milestone", label: "Milestone" },
        { key: "project", label: "Project" }
      ]},
      { name: "priority", height: 22, map_to: "priority", type: "select", options: [
        { key: "low", label: "Low" },
        { key: "medium", label: "Medium" },
        { key: "high", label: "High" }
      ]},
      { name: "time", type: "duration", map_to: "auto", time_format: ["%d", "%m", "%Y"] }
    ];

    // Custom task types
    gantt.config.types.milestone = "milestone";

    // Enable tooltip and plugins
    gantt.plugins({
      tooltip: true,
      marker: true,
      critical_path: true,
      undo: true
    });

    // Initialize gantt
    gantt.init(ganttContainer.current);
    setInitialized(true);

    // Add event handlers for task operations
    gantt.attachEvent("onAfterTaskAdd", (id: string, task: any) => {
      const taskData = {
        task_name: task.text,
        start_date: task.start_date,
        end_date: task.end_date || new Date(new Date(task.start_date).getTime() + task.duration * 24 * 60 * 60 * 1000),
        duration: task.duration,
        progress: task.progress ? task.progress * 100 : 0, // Convert from 0-1 to 0-100
        priority: task.priority || "medium",
        task_type: task.type || "task",
        parent_id: task.parent || null,
        color: task.color || "#3B82F6"
      };
      
      onCreateTask(taskData).catch(() => {
        gantt.deleteTask(id);
      });
    });

    gantt.attachEvent("onAfterTaskUpdate", (id: string, task: any) => {
      const updates = {
        task_name: task.text,
        start_date: task.start_date,
        end_date: task.end_date,
        duration: task.duration,
        progress: task.progress ? task.progress * 100 : 0, // Convert from 0-1 to 0-100
        priority: task.priority,
        task_type: task.type,
        parent_id: task.parent || null,
        color: task.color
      };
      
      onUpdateTask(id, updates);
    });

    gantt.attachEvent("onAfterTaskDelete", (id: string) => {
      onDeleteTask(id);
    });

    // Add event handlers for link operations
    gantt.attachEvent("onAfterLinkAdd", (id: string, link: any) => {
      const linkData = {
        source_task_id: link.source,
        target_task_id: link.target,
        dependency_type: link.type.toString(),
        lag_days: link.lag || 0
      };
      
      onCreateLink(linkData).catch(() => {
        gantt.deleteLink(id);
      });
    });

    gantt.attachEvent("onAfterLinkDelete", (id: string) => {
      onDeleteLink(id);
    });

    // Cleanup function
    return () => {
      gantt.clearAll();
      gantt.detachAllEvents();
      gantt.destructor();
    };
  }, [onCreateTask, onUpdateTask, onDeleteTask, onCreateLink, onDeleteLink]);

  // Load data into gantt
  useEffect(() => {
    if (!initialized || isLoading) return;
    
    // Format data for DHTMLX Gantt
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      text: task.task_name,
      start_date: new Date(task.start_date),
      end_date: new Date(task.end_date),
      duration: task.duration,
      progress: task.progress ? task.progress / 100 : 0, // Convert to 0-1 range
      parent: task.parent_id || 0,
      color: task.color,
      priority: task.priority || "medium",
      type: task.task_type === "milestone" ? "milestone" : "task",
      open: true,
      // Store original data for reference
      original: task
    }));

    const formattedLinks = dependencies.map(link => ({
      id: link.id,
      source: link.source_task_id,
      target: link.target_task_id,
      type: link.dependency_type ? parseInt(link.dependency_type) : 0,
      lag: link.lag_days || 0
    }));

    // Clear and load data
    gantt.clearAll();
    // Use a type assertion to work around the type issues with DHTMLX API
    gantt.parse({
      tasks: formattedTasks,
      links: formattedLinks
    } as any);
    
    // Adjust view to show all tasks
    gantt.sort("start_date", false);
    gantt.showDate(new Date());
    gantt.render();
  }, [tasks, dependencies, isLoading, initialized]);
  
  return (
    <div className="dhtmlx-gantt-wrapper">
      <div className="dhtmlx-gantt-toolbar">
        <div className="dhtmlx-gantt-zoom-buttons">
          <button onClick={() => gantt.ext.zoom.zoomIn()}>Zoom In</button>
          <button onClick={() => gantt.ext.zoom.zoomOut()}>Zoom Out</button>
          <button onClick={() => gantt.ext.zoom.setLevel("day")}>Day</button>
          <button onClick={() => gantt.ext.zoom.setLevel("week")}>Week</button>
          <button onClick={() => gantt.ext.zoom.setLevel("month")}>Month</button>
          <button onClick={() => gantt.ext.zoom.setLevel("quarter")}>Quarter</button>
          <button onClick={() => gantt.ext.zoom.setLevel("year")}>Year</button>
        </div>
        <div className="dhtmlx-gantt-actions">
          <button onClick={() => gantt.exportToPDF()}>Export to PDF</button>
          <button onClick={() => gantt.exportToExcel()}>Export to Excel</button>
          <button onClick={() => gantt.exportToPNG()}>Export to PNG</button>
          <button onClick={() => gantt.undo()}>Undo</button>
          <button onClick={() => gantt.redo()}>Redo</button>
          <button onClick={() => gantt.ext.critical_path.toggle()}>Toggle Critical Path</button>
        </div>
      </div>
      <div 
        ref={ganttContainer} 
        style={{ width: '100%', height: 'calc(100vh - 230px)', minHeight: '500px' }} 
        className="dhtmlx-gantt"
      />

      <style>
        {`
        .dhtmlx-gantt-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .dhtmlx-gantt-toolbar {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background-color: var(--background);
          border-bottom: 1px solid var(--border);
        }
        
        .dhtmlx-gantt-zoom-buttons,
        .dhtmlx-gantt-actions {
          display: flex;
          gap: 8px;
        }
        
        .dhtmlx-gantt-toolbar button {
          padding: 4px 8px;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .dhtmlx-gantt-toolbar button:hover {
          background-color: var(--primary-foreground);
        }
        
        .dhtmlx-gantt {
          flex: 1;
        }
        
        /* Custom styling for the gantt chart */
        .gantt_task_line {
          border-radius: 4px;
        }
        
        .gantt_task_progress {
          background-color: rgba(0, 0, 0, 0.2);
        }
        
        .weekend {
          background-color: #f8f8f8;
        }
        
        .gantt_task_milestone {
          background-color: #ff5722;
          border-color: #e64a19;
        }
        `}
      </style>
    </div>
  );
}