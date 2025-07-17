import { useRef, useEffect, useState } from 'react';
import { gantt } from 'dhtmlx-gantt';

interface GanttTask {
  id: string;
  text: string;
  start_date: Date;
  end_date?: Date;
  duration?: number;
  progress?: number;
  parent?: string;
  type?: string;
}

interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: string;
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

  // Basic initialization
  useEffect(() => {
    if (!ganttContainer.current) return;

    try {
      // Basic configurations
      gantt.config.xml_date = "%Y-%m-%d %H:%i";
      gantt.config.scale_unit = "day";
      gantt.config.duration_unit = "day";
      gantt.config.row_height = 30;
      gantt.config.min_column_width = 30;

      // Initialize gantt in container
      gantt.init(ganttContainer.current);
      setInitialized(true);

      return () => {
        try {
          gantt.clearAll();
          gantt.destructor();
          setInitialized(false);
        } catch (err) {
          console.error('Error cleaning up Gantt:', err);
        }
      };
    } catch (error) {
      console.error('Error initializing Gantt chart:', error);
    }
  }, []);

  // Configure advanced features after basic initialization
  useEffect(() => {
    if (!initialized) return;

    try {
      // Configure columns
      gantt.config.columns = [
        { name: "text", label: "Task name", tree: true, width: 200 },
        { name: "start_date", label: "Start", align: "center", width: 80 },
        { name: "duration", label: "Duration", align: "center", width: 50 }
      ];

      // Enable features
      gantt.config.drag_progress = true;
      gantt.config.drag_resize = true;
      gantt.config.drag_move = true;
      gantt.config.drag_links = true;

      // Event handlers
      gantt.attachEvent("onAfterTaskAdd", (id, task) => {
        const taskData = {
          task_name: task.text,
          start_date: task.start_date,
          end_date: task.end_date,
          duration: task.duration,
          parent_id: task.parent || null
        };
        onCreateTask(taskData);
      });

      gantt.attachEvent("onAfterTaskUpdate", (id, task) => {
        const updates = {
          task_name: task.text,
          start_date: task.start_date,
          end_date: task.end_date,
          duration: task.duration,
          parent_id: task.parent || null
        };
        onUpdateTask(String(id), updates);
      });

      gantt.attachEvent("onAfterTaskDelete", (id) => {
        onDeleteTask(String(id));
      });

      gantt.attachEvent("onAfterLinkAdd", (id, link) => {
        const linkData = {
          source_task_id: link.source,
          target_task_id: link.target,
          dependency_type: link.type
        };
        onCreateLink(linkData);
      });

      gantt.attachEvent("onAfterLinkDelete", (id) => {
        onDeleteLink(String(id));
      });

      // Render initial state
      gantt.render();
    } catch (error) {
      console.error('Error configuring Gantt chart:', error);
    }
  }, [initialized, onCreateTask, onUpdateTask, onDeleteTask, onCreateLink, onDeleteLink]);

  // Update data when tasks or dependencies change
  useEffect(() => {
    if (!initialized || isLoading) return;

    try {
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        text: task.task_name,
        start_date: new Date(task.start_date),
        end_date: new Date(task.end_date),
        duration: task.duration,
        parent: task.parent_id || null,
        progress: task.progress ? task.progress / 100 : 0
      }));

      const formattedLinks = dependencies.map(link => ({
        id: link.id,
        source: link.source_task_id,
        target: link.target_task_id,
        type: link.dependency_type || "0"
      }));

      gantt.clearAll();
      gantt.parse({
        data: formattedTasks,
        links: formattedLinks
      });
    } catch (error) {
      console.error('Error updating Gantt data:', error);
    }
  }, [tasks, dependencies, initialized, isLoading]);

  return (
    <div className="gantt-container">
      <div 
        ref={ganttContainer} 
        style={{ width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px' }} 
        className="gantt-chart"
      />
    </div>
  );
}