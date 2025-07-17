import { useRef, useEffect, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';

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
          start_date: task.start_date,
          end_date: task.end_date,
          duration: task.duration || 1,
          parent_id: task.parent || null,
          progress: 0
        };
        onCreateTask(taskData).catch(console.error);
      });

      gantt.attachEvent("onAfterTaskUpdate", (id, task) => {
        const updates = {
          task_name: task.text,
          start_date: task.start_date,
          end_date: task.end_date,
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
        const linkData = {
          source_task_id: String(link.source),
          target_task_id: String(link.target),
          dependency_type: String(link.type || 0),
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

    try {
      const formattedTasks = tasks.map(task => ({
        id: String(task.id),
        text: task.task_name || 'Untitled Task',
        start_date: new Date(task.start_date),
        end_date: new Date(task.end_date),
        duration: task.duration || 1,
        parent: task.parent_id ? String(task.parent_id) : undefined,
        progress: task.progress ? task.progress / 100 : 0
      }));

      const formattedLinks = (dependencies || []).map(link => ({
        id: String(link.id),
        source: String(link.source_task_id),
        target: String(link.target_task_id),
        type: String(link.dependency_type || "0")
      }));

      // Clear and parse new data
      gantt.clearAll();
      gantt.parse({
        data: formattedTasks,
        links: formattedLinks
      });

    } catch (error) {
      console.error('Error updating Gantt data:', error);
    }
  }, [tasks, dependencies, ganttReady, isLoading]);

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
      <div className="gantt-toolbar mb-2 p-2 bg-muted rounded">
        <div className="text-sm text-muted-foreground">
          Professional Gantt Chart - {tasks.length} tasks, {dependencies.length} dependencies
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