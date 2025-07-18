import { useRef, useEffect, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

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
  const [ganttReady, setGanttReady] = useState(false);

  // Initialize gantt once
  useEffect(() => {
    if (!ganttContainer.current) return;

    let isCleanedUp = false;

    try {
      // Clear any existing data
      gantt.clearAll();

      // Basic configuration first
      gantt.config.xml_date = "%Y-%m-%d %H:%i:%s";
      gantt.config.fit_tasks = true;
      gantt.config.auto_types = true;
      
      // Initialize with minimal setup to avoid internal errors
      gantt.init(ganttContainer.current);
      
      if (!isCleanedUp) {
        setGanttReady(true);
      }

    } catch (error) {
      console.error('Failed to initialize Gantt:', error);
    }

    return () => {
      isCleanedUp = true;
      setGanttReady(false);
      try {
        gantt.clearAll();
        // Don't call destructor as it can cause issues in development
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, []);

  // Configure gantt after initialization
  useEffect(() => {
    if (!ganttReady) return;

    try {
      // Configure columns
      gantt.config.columns = [
        { name: "text", label: "Task name", tree: true, width: 200 },
        { name: "start_date", label: "Start", align: "center", width: 80 },
        { name: "duration", label: "Duration", align: "center", width: 50 }
      ];

      // Configure behavior
      gantt.config.drag_progress = true;
      gantt.config.drag_resize = true;
      gantt.config.drag_move = true;
      gantt.config.drag_links = true;
      gantt.config.details_on_dblclick = true;
      gantt.config.readonly = false;

      // Set up event handlers
      gantt.attachEvent("onAfterTaskAdd", (id, task) => {
        const taskData = {
          task_name: task.text || 'New Task',
          start_date: task.start_date instanceof Date ? task.start_date.toISOString() : new Date().toISOString(),
          end_date: task.end_date instanceof Date ? task.end_date.toISOString() : new Date(Date.now() + 24*60*60*1000).toISOString(),
          duration: task.duration || 1,
          parent_id: task.parent || null,
          progress: 0
        };
        onCreateTask(taskData).catch(console.error);
      });

      gantt.attachEvent("onAfterTaskUpdate", (id, task) => {
        const updates = {
          task_name: task.text,
          start_date: task.start_date instanceof Date ? task.start_date.toISOString() : task.start_date,
          end_date: task.end_date instanceof Date ? task.end_date.toISOString() : task.end_date,
          duration: task.duration,
          parent_id: task.parent || null,
          progress: task.progress ? task.progress * 100 : 0
        };
        onUpdateTask(String(id), updates);
      });

      gantt.attachEvent("onAfterTaskDelete", (id) => {
        onDeleteTask(String(id));
      });

      gantt.attachEvent("onAfterLinkAdd", (id, link) => {
        // Convert link type number to dependency type string
        let dependencyType = 'finish_to_start';
        if (link.type === "1") dependencyType = 'start_to_start';
        else if (link.type === "2") dependencyType = 'finish_to_finish';  
        else if (link.type === "3") dependencyType = 'start_to_finish';
        
        const linkData = {
          source_task_id: String(link.source),
          target_task_id: String(link.target),
          dependency_type: dependencyType,
          lag_days: 0
        };
        onCreateLink(linkData).catch(console.error);
      });

      gantt.attachEvent("onAfterLinkDelete", (id) => {
        onDeleteLink(String(id));
      });

      // Render the updated configuration
      gantt.render();

    } catch (error) {
      console.error('Error configuring Gantt:', error);
    }
  }, [ganttReady, onCreateTask, onUpdateTask, onDeleteTask, onCreateLink, onDeleteLink]);

  // Update data when tasks change
  useEffect(() => {
    if (!ganttReady || isLoading) return;

    console.log('Updating Gantt data:', { tasks: tasks.length, dependencies: dependencies.length });

    try {
      const formattedTasks = tasks.map(task => {
        const startDate = new Date(task.start_date);
        const endDate = new Date(task.end_date);
        
        // Ensure dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date for task:', task);
          const today = new Date();
          const tomorrow = new Date(today.getTime() + 24*60*60*1000);
          
          return {
            id: String(task.id),
            text: task.task_name || 'Untitled Task',
            start_date: today,
            end_date: tomorrow,
            duration: 1,
            parent: task.parent_id ? String(task.parent_id) : undefined,
            progress: task.progress ? task.progress / 100 : 0
          };
        }
        
        return {
          id: String(task.id),
          text: task.task_name || 'Untitled Task',
          start_date: startDate,
          end_date: endDate,
          duration: task.duration || 1,
          parent: task.parent_id ? String(task.parent_id) : undefined,
          progress: task.progress ? task.progress / 100 : 0
        };
      });

      // Map dependency types correctly
      const formattedLinks = (dependencies || []).map(link => {
        let linkType = "0"; // Default to finish-to-start
        if (link.dependency_type === 'start_to_start') linkType = "1";
        else if (link.dependency_type === 'finish_to_finish') linkType = "2";
        else if (link.dependency_type === 'start_to_finish') linkType = "3";
        
        return {
          id: String(link.id),
          source: String(link.source_task_id),
          target: String(link.target_task_id),
          type: linkType
        };
      });

      console.log('Formatted data:', { formattedTasks, formattedLinks });

      // Clear and parse new data
      gantt.clearAll();
      gantt.parse({
        data: formattedTasks,
        links: formattedLinks
      });

      // Force render
      gantt.render();
      console.log('Gantt rendered successfully');

    } catch (error) {
      console.error('Error updating Gantt data:', error);
    }
  }, [tasks, dependencies, ganttReady, isLoading]);

  const handleAddTask = () => {
    const newTask = {
      task_name: 'New Task',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 24*60*60*1000).toISOString(),
      duration: 1,
      progress: 0,
      parent_id: null
    };
    onCreateTask(newTask);
  };

  if (isLoading) {
    return (
      <div className="gantt-loading">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading Gantt Chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper">
      <div className="gantt-toolbar mb-4 p-3 bg-muted rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Professional Gantt Chart - {tasks.length} tasks, {dependencies.length} dependencies
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleAddTask}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              + Add Task
            </button>
            <button 
              onClick={() => gantt.exportToPDF && gantt.exportToPDF()}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/90 transition-colors"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>
      <div 
        ref={ganttContainer} 
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 250px)', 
          minHeight: '400px',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }} 
        className="gantt-chart"
      />
    </div>
  );
}