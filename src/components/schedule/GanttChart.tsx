import React, { useState, useMemo, useCallback } from 'react';
import { Gantt, Task, ViewMode, DisplayOption } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, RefreshCw, ZoomIn, ZoomOut, Search } from 'lucide-react';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { convertResourceIdsToNames } from '@/utils/ganttUtilsSimple';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { PublishScheduleDialog } from './PublishScheduleDialog';
import { AddTaskDialog } from './AddTaskDialog';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule, isLoading: isPublishing } = usePublishSchedule(projectId);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    task: Task | null;
  }>({ isOpen: false, task: null });
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Set up real-time updates for task confirmations
  useEffect(() => {
    const channel = supabase
      .channel('schedule-task-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_schedule_tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Task confirmation updated via realtime:', payload);
          setForceRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Transform tasks to gantt-task-react format
  const ganttTasks = useMemo(() => {
    console.log('=== TRANSFORMING TASKS FOR GANTT-TASK-REACT ===');
    console.log('Raw tasks:', tasks);
    
    if (!tasks || tasks.length === 0) return [];

    // Build parent-child map for hierarchy
    const childrenMap = new Map<string, ProjectTask[]>();
    const rootTasks: ProjectTask[] = [];

    tasks.forEach(task => {
      if (task.parent_id) {
        if (!childrenMap.has(task.parent_id)) {
          childrenMap.set(task.parent_id, []);
        }
        childrenMap.get(task.parent_id)!.push(task);
      } else {
        rootTasks.push(task);
      }
    });

    // Recursive function to build task hierarchy
    const buildTaskHierarchy = (parentTasks: ProjectTask[], level = 0): Task[] => {
      return parentTasks
        .sort((a, b) => a.order_index - b.order_index)
        .map(task => {
          const children = childrenMap.get(task.id) || [];
          const hasChildren = children.length > 0;
          
          // Get task confirmation status for color coding
          const confirmed = task.confirmed;
          let styles: any = {};
          
          if (confirmed === true) {
            // Green for confirmed tasks
            styles = {
              backgroundColor: '#22c55e',
              backgroundSelectedColor: '#16a34a',
              progressColor: '#15803d',
              progressSelectedColor: '#166534'
            };
          } else if (confirmed === false) {
            // Red for denied tasks
            styles = {
              backgroundColor: '#ef4444',
              backgroundSelectedColor: '#dc2626',
              progressColor: '#b91c1c',
              progressSelectedColor: '#991b1b'
            };
          } else {
            // Blue for pending tasks
            styles = {
              backgroundColor: '#3b82f6',
              backgroundSelectedColor: '#2563eb',
              progressColor: '#1d4ed8',
              progressSelectedColor: '#1e40af'
            };
          }

          const ganttTask: Task = {
            start: new Date(task.start_date),
            end: new Date(task.end_date),
            name: task.task_name,
            id: task.id,
            type: hasChildren ? 'project' : 'task',
            progress: task.progress || 0,
            isDisabled: false,
            styles,
            displayOrder: task.order_index
          };

          // Add dependencies if they exist
          if (task.predecessor) {
            const depIds = task.predecessor.split(',').map(dep => dep.trim());
            ganttTask.dependencies = depIds;
          }

          return ganttTask;
        });
    };

    const result = buildTaskHierarchy(rootTasks);
    console.log('Transformed gantt tasks:', result);
    return result;
  }, [tasks, forceRefreshKey]);

  // Task event handlers
  const handleTaskChange = useCallback((task: Task) => {
    console.log('Task changed:', task);
    
    const updateData = {
      id: task.id,
      task_name: task.name,
      start_date: task.start.toISOString(),
      end_date: task.end.toISOString(),
      progress: task.progress || 0,
      duration: Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))
    };

    updateTask.mutate(updateData);
  }, [updateTask]);

  const handleTaskDelete = useCallback((task: Task) => {
    setDeleteConfirmation({ isOpen: true, task });
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmation.task) {
      deleteTask.mutate(deleteConfirmation.task.id, {
        onSuccess: () => {
          setDeleteConfirmation({ isOpen: false, task: null });
          toast({
            title: "Task deleted",
            description: "The task has been successfully deleted.",
          });
        }
      });
    }
  }, [deleteConfirmation.task, deleteTask]);

  const handleTaskSelect = useCallback((task: Task, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTask(task);
    } else {
      setSelectedTask(null);
    }
  }, []);

  const handleAddTask = useCallback(() => {
    // For now, create a simple task directly
    const taskName = prompt('Enter task name:');
    if (taskName) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      createTask.mutate({
        project_id: projectId,
        task_name: taskName,
        start_date: today.toISOString(),
        end_date: tomorrow.toISOString(),
        duration: 1,
        progress: 0,
        parent_id: selectedTask?.id || null,
        resources: null,
        predecessor: null,
        order_index: tasks.length
      });
    }
  }, [createTask, selectedTask, tasks.length]);

  const handlePublish = useCallback(() => {
    setPublishDialogOpen(true);
  }, []);

  // Display options for the gantt chart
  const displayOptions: DisplayOption = {
    viewMode,
    locale: 'en-US',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading project schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-destructive">Error loading schedule: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button onClick={handleAddTask} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
          <Button onClick={handlePublish} size="sm" disabled={isPublishing}>
            <Calendar className="h-4 w-4 mr-2" />
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
          <Button 
            onClick={() => setForceRefreshKey(prev => prev + 1)} 
            size="sm" 
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setViewMode(ViewMode.Day)}
            size="sm"
            variant={viewMode === ViewMode.Day ? "default" : "outline"}
          >
            Day
          </Button>
          <Button
            onClick={() => setViewMode(ViewMode.Week)}
            size="sm"
            variant={viewMode === ViewMode.Week ? "default" : "outline"}
          >
            Week
          </Button>
          <Button
            onClick={() => setViewMode(ViewMode.Month)}
            size="sm"
            variant={viewMode === ViewMode.Month ? "default" : "outline"}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="h-[600px] w-full border rounded-lg overflow-hidden">
        {ganttTasks.length > 0 ? (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onProgressChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onSelect={handleTaskSelect}
            listCellWidth="200px"
            ganttHeight={550}
            columnWidth={60}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg mb-4">No tasks in this project yet</p>
              <Button onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Task
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PublishScheduleDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={publishSchedule}
      />


      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, task: null })}
        onConfirm={confirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.task?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};