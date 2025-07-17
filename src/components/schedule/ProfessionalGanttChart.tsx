import React, { useEffect, useRef, useCallback, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Users
} from 'lucide-react';

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
  task_type?: string;
  priority?: string;
  cost_estimate?: number;
  actual_cost?: number;
  notes?: string;
  completion_percentage?: number;
}

interface ProfessionalGanttChartProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskCreate?: (taskData: Partial<Task>) => Promise<void>;
  onLinkCreate?: (linkData: any) => Promise<void>;
  onLinkDelete?: (linkId: string) => void;
}

export function ProfessionalGanttChart({ 
  tasks, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskCreate,
  onLinkCreate,
  onLinkDelete 
}: ProfessionalGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // CRITICAL: Safe date conversion with validation
  const safeDateToString = useCallback((date: any): string => {
    if (!date) {
      console.warn('Date is null/undefined, using today');
      return gantt.date.date_to_str("%Y-%m-%d")(new Date());
    }
    
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        console.warn('Invalid date string:', date, 'using today');
        return gantt.date.date_to_str("%Y-%m-%d")(new Date());
      }
      return gantt.date.date_to_str("%Y-%m-%d")(parsedDate);
    }
    
    if (date instanceof Date && !isNaN(date.getTime())) {
      return gantt.date.date_to_str("%Y-%m-%d")(date);
    }
    
    console.warn('Invalid date object:', date, 'using today');
    return gantt.date.date_to_str("%Y-%m-%d")(new Date());
  }, []);

  // CRITICAL: Fixed data processor that returns PROMISES for DHTMLX
  const handleTaskAction = useCallback((type: string, action: string, item: any, id: string) => {
    console.log('Data processor called:', { type, action, item, id });
    
    // DHTMLX requires a Promise return - this is critical!
    return new Promise((resolve, reject) => {
      try {
        if (action === "delete" && onTaskDelete) {
          console.log('Deleting task:', id);
          try {
            onTaskDelete(id);
            toast.success("Task deleted successfully");
            resolve({ tid: id, sid: id });
          } catch (error) {
            console.error('Delete failed:', error);
            toast.error("Failed to delete task");
            resolve({ tid: id, sid: id }); // Still resolve to prevent loops
          }
          
        } else if (action === "create" && onTaskCreate) {
          console.log('Creating task with item:', item);
          
          // Provide defaults for new tasks
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const startDate = item.start_date || today;
          const endDate = item.end_date || tomorrow;
          
          const taskData: Partial<Task> = {
            task_name: item.text || "New Task",
            start_date: safeDateToString(startDate),
            end_date: safeDateToString(endDate),
            duration: item.duration || 1,
            progress: Math.round((item.progress || 0) * 100),
            assigned_to: item.assigned_to || "",
            color: item.color || "#3b82f6",
            parent_id: item.parent || null,
            task_type: item.type || "task",
            priority: item.priority || "medium",
            cost_estimate: item.cost_estimate || null,
            notes: item.notes || ""
          };
          
          console.log('Task data to create:', taskData);
          
          const createResult = onTaskCreate(taskData);
          if (createResult && typeof createResult.then === 'function') {
            createResult.then(() => {
              toast.success("Task created successfully");
              resolve({ tid: id, sid: id });
            }).catch((error) => {
              console.error('Create failed:', error);
              toast.error("Failed to create task");
              resolve({ tid: id, sid: id }); // Still resolve to prevent loops
            });
          } else {
            toast.success("Task created successfully");
            resolve({ tid: id, sid: id });
          }
          
        } else if (action === "update" && onTaskUpdate) {
          console.log('Updating task:', id, 'with item:', item);
          
          const updates: Partial<Task> = {
            task_name: item.text || "Untitled Task",
            start_date: safeDateToString(item.start_date),
            end_date: safeDateToString(item.end_date),
            duration: item.duration || 1,
            progress: Math.round((item.progress || 0) * 100),
            assigned_to: item.assigned_to || "",
            color: item.color || "#3b82f6",
            task_type: item.type || "task",
            priority: item.priority || "medium",
            cost_estimate: item.cost_estimate || null,
            notes: item.notes || ""
          };
          
          console.log('Task updates:', updates);
          
          try {
            onTaskUpdate(id, updates);
            toast.success("Task updated successfully");
            resolve({ tid: id, sid: id });
          } catch (error) {
            console.error('Update failed:', error);
            toast.error("Failed to update task");
            resolve({ tid: id, sid: id }); // Still resolve to prevent loops
          }
          
        } else {
          console.warn('Unknown action or missing handler:', action);
          resolve({ tid: id, sid: id }); // Default success response
        }
        
      } catch (error) {
        console.error("Task action failed:", error);
        toast.error(`Failed to ${action} task: ${error.message}`);
        resolve({ tid: id, sid: id }); // Always resolve to prevent router errors
      }
    });
  }, [onTaskUpdate, onTaskDelete, onTaskCreate, safeDateToString]);

  // CRITICAL: Fixed link processor that returns PROMISES
  const handleLinkAction = useCallback((action: string, link: any) => {
    console.log('Link processor called:', { action, link });
    
    // DHTMLX requires a Promise return - this is critical!
    return new Promise((resolve, reject) => {
      try {
        if (action === "create" && onLinkCreate) {
          const createResult = onLinkCreate({
            source_task_id: link.source,
            target_task_id: link.target,
            dependency_type: "finish_to_start",
            lag_days: 0
          });
          if (createResult && typeof createResult.then === 'function') {
            createResult.then(() => {
              toast.success("Dependency created successfully");
              resolve({ tid: link.id, sid: link.id });
            }).catch((error) => {
              console.error('Link create failed:', error);
              toast.error("Failed to create dependency");
              resolve({ tid: link.id, sid: link.id }); // Still resolve to prevent loops
            });
          } else {
            toast.success("Dependency created successfully");
            resolve({ tid: link.id, sid: link.id });
          }
          
        } else if (action === "delete" && onLinkDelete) {
          try {
            onLinkDelete(link.id);
            toast.success("Dependency removed successfully");
            resolve({ tid: link.id, sid: link.id });
          } catch (error) {
            console.error('Link delete failed:', error);
            toast.error("Failed to remove dependency");
            resolve({ tid: link.id, sid: link.id }); // Still resolve to prevent loops
          }
          
        } else {
          resolve({ tid: link.id, sid: link.id }); // Default success response
        }
        
      } catch (error) {
        console.error("Link action failed:", error);
        toast.error(`Failed to ${action} dependency: ${error.message}`);
        resolve({ tid: link.id, sid: link.id }); // Always resolve to prevent router errors
      }
    });
  }, [onLinkCreate, onLinkDelete]);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;

    // Configure Gantt for professional use - STABLE CONFIGURATION
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    gantt.config.duration_unit = "day";
    gantt.config.work_time = false; // Disable work time calculations
    
    // CRITICAL: Disable ALL auto-resize and auto-fit features
    gantt.config.auto_resize = false;
    gantt.config.autosize = false;
    gantt.config.fit_tasks = false;
    gantt.config.smart_rendering = false;
    gantt.config.static_background = true;
    
    // Enable controlled interactive features only
    gantt.config.drag_progress = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_links = true;
    gantt.config.drag_move = true;
    gantt.config.sort = true;
    gantt.config.readonly = false;
    
    // Fixed layout configuration - NO AUTO-SIZING
    gantt.config.grid_resize = true;
    gantt.config.row_height = 36;
    gantt.config.task_height = 28;
    gantt.config.bar_height = 24;
    gantt.config.scale_height = 50;
    
    // DISABLE auto-scheduling to prevent loops
    gantt.config.auto_scheduling = false;
    gantt.config.auto_scheduling_strict = false;
    gantt.config.critical_path = false; // Disable critical path auto-calculation
    
    // Configure professional columns
    gantt.config.columns = [
      { 
        name: "text", 
        label: "Task Name", 
        tree: true, 
        width: 280,
        resize: true
      },
      { 
        name: "start_date", 
        label: "Start Date", 
        width: 100, 
        align: "center",
        resize: true
      },
      { 
        name: "duration", 
        label: "Duration", 
        width: 80, 
        align: "center",
        resize: true
      },
      { 
        name: "progress", 
        label: "Progress", 
        width: 80, 
        align: "center",
        resize: true,
        template: (task: any) => Math.round((task.progress || 0) * 100) + "%"
      },
      { 
        name: "assigned_to", 
        label: "Assignee", 
        width: 120, 
        align: "center",
        resize: true
      },
      { 
        name: "priority", 
        label: "Priority", 
        width: 80, 
        align: "center",
        resize: true,
        template: (task: any) => {
          const priority = task.priority || 'medium';
          const colors = {
            high: '#ef4444',
            medium: '#f59e0b', 
            low: '#10b981'
          };
          return `<span style="color: ${colors[priority as keyof typeof colors] || colors.medium}">
            ${priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>`;
        }
      },
      { 
        name: "add", 
        label: "", 
        width: 44,
        resize: false
      }
    ];

    // Enable progress display and task cells
    gantt.config.show_progress = true;
    gantt.config.show_task_cells = true;
    gantt.config.show_links = true;
    
    // Configure task colors and types
    gantt.templates.task_class = (start, end, task) => {
      let classes = [];
      
      if (task.priority === 'high') classes.push('gantt_high_priority');
      if (task.progress >= 1) classes.push('gantt_completed');
      if (task.critical) classes.push('gantt_critical');
      if (task.parent) classes.push('gantt_child_task');
      
      return classes.join(' ');
    };
    
    gantt.templates.task_row_class = (start, end, task) => {
      if (selectedTask === task.id) return "gantt_selected_row";
      return task.parent ? "gantt_child_row" : "gantt_parent_row";
    };

    // Configure links (dependencies)
    gantt.config.link_wrapper_width = 20;
    gantt.config.link_line_width = 2;
    gantt.config.link_arrow_size = 8;
    
    // FIXED scale configuration (modern approach)
    gantt.config.scales = [
      { unit: "month", step: 1, format: "%F %Y" },
      { unit: "day", step: 1, format: "%d" }
    ];
    
    // Initialize Gantt with FIXED dimensions
    gantt.init(containerRef.current);
    
    // CRITICAL: Set fixed size immediately and disable auto-sizing
    gantt.setSizes = () => {}; // Override setSizes to prevent resize loops
    const dataProcessor = gantt.createDataProcessor(handleTaskAction);
    dataProcessor.init(gantt);
    
    // Set up link data processor
    const linkProcessor = gantt.createDataProcessor((type, action, item, id) => {
      if (type === "link") {
        return handleLinkAction(action, item);
      }
      return { status: "success" };
    });
    linkProcessor.init(gantt);
    
    // Event handlers for professional features
    gantt.attachEvent("onTaskClick", (id) => {
      setSelectedTask(String(id));
      return true;
    });

    gantt.attachEvent("onTaskDblClick", (id) => {
      gantt.showLightbox(id);
      return false;
    });

    gantt.attachEvent("onBeforeTaskAdd", (id, task) => {
      console.log('Before task add:', { id, task });
      
      // CRITICAL: Ensure valid dates for new tasks
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Provide comprehensive defaults
      task.text = task.text || "New Task";
      task.start_date = task.start_date || today;
      task.end_date = task.end_date || tomorrow;
      task.duration = task.duration || 1;
      task.progress = task.progress || 0;
      task.priority = task.priority || 'medium';
      task.type = task.type || 'task';
      task.color = task.color || '#3b82f6';
      
      console.log('Task after defaults:', task);
      return true;
    });

    // Professional lightbox configuration
    gantt.config.lightbox.sections = [
      { 
        name: "description", 
        height: 38, 
        map_to: "text", 
        type: "textarea", 
        focus: true 
      },
      { 
        name: "type", 
        type: "select", 
        map_to: "type", 
        options: gantt.serverList("taskType", [
          { key: "task", label: "Task" },
          { key: "milestone", label: "Milestone" },
          { key: "project", label: "Project" }
        ])
      },
      { 
        name: "priority", 
        type: "select", 
        map_to: "priority", 
        options: gantt.serverList("priority", [
          { key: "low", label: "Low" },
          { key: "medium", label: "Medium" },
          { key: "high", label: "High" }
        ])
      },
      { 
        name: "assigned_to", 
        height: 22, 
        map_to: "assigned_to", 
        type: "textarea" 
      },
      { 
        name: "cost", 
        height: 22, 
        map_to: "cost_estimate", 
        type: "textarea" 
      },
      { 
        name: "notes", 
        height: 60, 
        map_to: "notes", 
        type: "textarea" 
      },
      { 
        name: "time", 
        type: "duration", 
        map_to: "auto" 
      }
    ];

    isInitialized.current = true;

    // Cleanup function
    return () => {
      if (dataProcessor) {
        dataProcessor.destructor();
      }
      if (linkProcessor) {
        linkProcessor.destructor();
      }
      gantt.clearAll();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      isInitialized.current = false;
    };
  }, [handleTaskAction, handleLinkAction, selectedTask]);

  // Update data when tasks change
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
        color: task.color || "#3b82f6",
        type: task.task_type || "task",
        priority: task.priority || "medium",
        cost_estimate: task.cost_estimate || 0,
        notes: task.notes || "",
        order: task.order_index || 0
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

    // Clear and reload data WITHOUT triggering resize loops
    gantt.clearAll();
    gantt.parse(ganttData);
    
    // CRITICAL: Do NOT call autofit or render - causes infinite loops
    // The chart will render automatically when data is parsed
    
  }, [tasks]);

  // Professional toolbar functions
  const handleZoomIn = () => {
    try {
      if (gantt.ext?.zoom) {
        gantt.ext.zoom.zoomIn();
      } else {
        gantt.changeLightboxType("month");
      }
    } catch (error) {
      console.warn("Zoom functionality not available");
    }
  };

  const handleZoomOut = () => {
    try {
      if (gantt.ext?.zoom) {
        gantt.ext.zoom.zoomOut();
      } else {
        gantt.changeLightboxType("year");
      }
    } catch (error) {
      console.warn("Zoom functionality not available");
    }
  };

  const handleZoomToFit = () => {
    try {
      if (gantt.ext?.zoom) {
        gantt.ext.zoom.setLevel("month");
      } else {
        gantt.config.scale_unit = "month";
        gantt.render();
      }
    } catch (error) {
      console.warn("Zoom functionality not available");
    }
  };

  const handleExportPDF = () => {
    try {
      if (gantt.exportToPDF) {
        gantt.exportToPDF({
          name: "project-schedule.pdf",
          header: "<h1>Project Schedule</h1>",
          footer: "<div>Generated on " + new Date().toLocaleDateString() + "</div>",
          locale: "en"
        });
      } else {
        toast.error("PDF export not available. Please install dhtmlx-gantt export plugin.");
      }
    } catch (error) {
      toast.error("Failed to export PDF");
    }
  };

  const handleExportExcel = () => {
    try {
      if (gantt.exportToExcel) {
        gantt.exportToExcel({
          name: "project-schedule.xlsx",
          columns: [
            { id: "text", header: "Task Name", width: 150 },
            { id: "start_date", header: "Start Date", width: 100 },
            { id: "duration", header: "Duration", width: 80 },
            { id: "progress", header: "Progress", width: 80 },
            { id: "assigned_to", header: "Assignee", width: 120 }
          ]
        });
      } else {
        toast.error("Excel export not available. Please install dhtmlx-gantt export plugin.");
      }
    } catch (error) {
      toast.error("Failed to export Excel");
    }
  };

  const handleAddTask = () => {
    const newTaskId = gantt.addTask({
      text: "New Task",
      start_date: new Date(),
      duration: 1,
      progress: 0,
      type: "task",
      priority: "medium"
    });
    
    gantt.selectTask(newTaskId);
    gantt.showLightbox(newTaskId);
  };

  const handleDeleteSelected = () => {
    if (selectedTask) {
      if (confirm('Are you sure you want to delete this task and all its subtasks?')) {
        gantt.deleteTask(selectedTask);
        setSelectedTask(null);
      }
    }
  };

  const handleSave = () => {
    gantt.save();
    toast.success("Schedule saved successfully");
  };

  return (
    <div className="professional-gantt-wrapper">
      {/* Professional Toolbar */}
      <div className="gantt-toolbar bg-background border-b border-border p-4 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 border-r border-border pr-2">
          <Button onClick={handleAddTask} size="sm" variant="default">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
          <Button 
            onClick={handleDeleteSelected} 
            size="sm" 
            variant="outline"
            disabled={!selectedTask}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button onClick={handleSave} size="sm" variant="outline">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
        
        <div className="flex items-center gap-2 border-r border-border pr-2">
          <Button onClick={handleZoomIn} size="sm" variant="outline">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={handleZoomOut} size="sm" variant="outline">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button onClick={handleZoomToFit} size="sm" variant="outline">
            <RotateCcw className="h-4 w-4 mr-1" />
            Fit
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleExportPDF} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
        
        {isLoading && (
          <div className="ml-auto text-sm text-muted-foreground">
            Saving changes...
          </div>
        )}
      </div>

      {/* Professional Gantt Styles */}
      <style>{`
        .professional-gantt-wrapper .gantt_container {
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .gantt_high_priority .gantt_task_content {
          background: linear-gradient(to right, #ef4444, #dc2626) !important;
          border-color: #dc2626 !important;
        }
        
        .gantt_completed .gantt_task_content {
          background: linear-gradient(to right, #10b981, #059669) !important;
          border-color: #059669 !important;
        }
        
        .gantt_critical .gantt_task_content {
          background: linear-gradient(to right, #f59e0b, #d97706) !important;
          border-color: #d97706 !important;
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        
        .gantt_selected_row {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        
        .gantt_child_row {
          background-color: #f8fafc;
        }
        
        .gantt_child_task .gantt_task_content {
          opacity: 0.9;
        }
        
        .gantt_grid_scale .gantt_grid_head_cell {
          background: linear-gradient(to bottom, #f1f5f9, #e2e8f0);
          border-color: #cbd5e1;
          font-weight: 600;
          color: #475569;
        }
        
        .gantt_task_line {
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .gantt_task_progress {
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.3);
        }
        
        .gantt_link_arrow {
          color: #64748b;
        }
        
        .gantt_link_line {
          background-color: #64748b;
        }
        
        .gantt_link_line:hover {
          background-color: #3b82f6;
          box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
        }
        
        .gantt_grid_data .gantt_cell {
          border-color: #e2e8f0;
        }
        
        .gantt_tree_icon {
          color: #64748b;
        }
        
        .gantt_add {
          color: #3b82f6;
        }
        
        .gantt_add:hover {
          color: #2563eb;
          background-color: rgba(59, 130, 246, 0.1);
        }
        
        /* Lightbox professional styling */
        .gantt_cal_light {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border-radius: 8px;
          border: none;
        }
        
        .gantt_cal_lheader {
          background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
          border-radius: 8px 8px 0 0;
          color: #1e293b;
          font-weight: 600;
        }
        
        .gantt_section_time {
          background-color: #f8fafc;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .gantt-toolbar {
            flex-direction: column;
            gap: 2px;
          }
          
          .gantt-toolbar > div {
            border-right: none !important;
            padding-right: 0 !important;
          }
        }
      `}</style>
      
      <div 
        ref={containerRef} 
        style={{ 
          width: "100%", 
          height: "700px",
          overflow: "hidden"
        }}
        className="gantt-container border border-border rounded-b-lg bg-background"
      />
    </div>
  );
}