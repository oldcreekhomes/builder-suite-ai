import { useEffect, useRef, useState } from "react";
import { Gantt } from "frappe-gantt";
import { ProjectTask, useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { usePublishSchedule } from "@/hooks/usePublishSchedule";
import { Plus, Calendar, ZoomIn, ZoomOut, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FrappeGanttChartProps {
  projectId: string;
}

interface FrappeTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
}

const FrappeGanttChart = ({ projectId }: FrappeGanttChartProps) => {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<Gantt | null>(null);
  const { user } = useAuth();
  const { data: tasks = [], isLoading, error, refetch } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { publishSchedule, isLoading: isPublishing } = usePublishSchedule(projectId);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week');

  // Transform tasks for Frappe Gantt
  const transformTasksForFrappe = (tasks: ProjectTask[]): FrappeTask[] => {
    return tasks.map(task => {
      // Determine task color based on confirmation status
      let customClass = 'pending'; // blue
      if (task.confirmed === true) {
        customClass = 'confirmed'; // green
      } else if (task.confirmed === false) {
        customClass = 'denied'; // red
      }

      return {
        id: task.id,
        name: task.task_name,
        start: new Date(task.start_date).toISOString().split('T')[0],
        end: new Date(task.end_date).toISOString().split('T')[0],
        progress: task.progress,
        dependencies: task.predecessor || undefined,
        custom_class: customClass,
      };
    });
  };

  // Initialize Frappe Gantt
  useEffect(() => {
    if (!ganttRef.current || !tasks.length) return;

    const frappeData = transformTasksForFrappe(tasks);
    
    if (ganttInstance.current) {
      ganttInstance.current.refresh(frappeData);
      return;
    }

    try {
      ganttInstance.current = new Gantt(ganttRef.current, frappeData, {
        header_height: 50,
        column_width: 30,
        step: 24,
        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
        bar_height: 20,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        language: 'en',
        custom_popup_html: (task: any) => {
          const originalTask = tasks.find(t => t.id === task.id);
          const confirmationStatus = originalTask?.confirmed === true ? 'Confirmed' 
            : originalTask?.confirmed === false ? 'Denied' 
            : 'Pending';
          
          return `
            <div class="details-container">
              <h5>${task.name}</h5>
              <p>Duration: ${task.duration} days</p>
              <p>Progress: ${task.progress}%</p>
              <p>Status: ${confirmationStatus}</p>
              ${task.dependencies ? `<p>Dependencies: ${task.dependencies}</p>` : ''}
            </div>
          `;
        },
        on_click: (task: any) => {
          setSelectedTaskId(task.id);
        },
        on_date_change: (task: any, start: Date, end: Date) => {
          console.log('Date changed:', task, start, end);
          updateTask.mutate({
            id: task.id,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            duration: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
          });
        },
        on_progress_change: (task: any, progress: number) => {
          console.log('Progress changed:', task, progress);
          updateTask.mutate({
            id: task.id,
            progress: progress,
          });
        },
        on_view_change: (mode: string) => {
          console.log('View mode changed:', mode);
        }
      });

      // Add custom CSS for task colors
      const style = document.createElement('style');
      style.textContent = `
        .gantt .bar.pending { fill: hsl(var(--primary)) !important; }
        .gantt .bar.confirmed { fill: hsl(142 76% 36%) !important; }
        .gantt .bar.denied { fill: hsl(0 84% 60%) !important; }
        .gantt .details-container { 
          padding: 10px; 
          font-size: 12px;
          line-height: 1.4;
        }
        .gantt .details-container h5 { 
          margin: 0 0 8px 0; 
          font-weight: 600;
        }
        .gantt .details-container p { 
          margin: 2px 0; 
          color: hsl(var(--muted-foreground));
        }
      `;
      document.head.appendChild(style);

    } catch (error) {
      console.error('Error initializing Frappe Gantt:', error);
      toast.error('Failed to initialize Gantt chart');
    }
  }, [tasks, viewMode, updateTask]);

  // Real-time updates for task confirmations
  useEffect(() => {
    if (!projectId || !user) return;

    const channel = supabase
      .channel(`task-confirmations-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_schedule_tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Task confirmation update:', payload);
          // Refresh the chart when confirmations change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user, refetch]);

  const handleAddTask = () => {
    const newTask = {
      project_id: projectId,
      task_name: "New Task",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
      duration: 1,
      progress: 0,
    };

    createTask.mutate(newTask, {
      onSuccess: () => {
        toast.success("Task added successfully");
      }
    });
  };

  const handleDeleteTask = () => {
    if (!selectedTaskId) return;
    
    deleteTask.mutate(selectedTaskId, {
      onSuccess: () => {
        toast.success("Task deleted successfully");
        setSelectedTaskId(null);
        setDeleteDialogOpen(false);
      }
    });
  };

  const changeViewMode = (mode: 'Day' | 'Week' | 'Month') => {
    setViewMode(mode);
    if (ganttInstance.current) {
      ganttInstance.current.change_view_mode(mode);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Schedule refreshed");
  };

  const handlePublish = (data: { daysFromToday: string; message?: string }) => {
    publishSchedule(data);
    setPublishDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-destructive">Failed to load schedule data</p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button onClick={handleAddTask} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            
            {selectedTaskId && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Task
              </Button>
            )}

            <Button 
              onClick={handleRefresh} 
              size="sm" 
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant={viewMode === 'Day' ? 'default' : 'outline'}
                onClick={() => changeViewMode('Day')}
              >
                Day
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'Week' ? 'default' : 'outline'}
                onClick={() => changeViewMode('Week')}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'Month' ? 'default' : 'outline'}
                onClick={() => changeViewMode('Month')}
              >
                Month
              </Button>
            </div>

            <Button 
              onClick={() => setPublishDialogOpen(true)} 
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Legend */}
      <Card className="p-4">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded" />
            <span>Pending Confirmation</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-600 rounded" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded" />
            <span>Denied</span>
          </div>
        </div>
      </Card>

      {/* Gantt Chart */}
      <Card className="p-6">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks scheduled</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first task to the project schedule.
            </p>
            <Button onClick={handleAddTask}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Task
            </Button>
          </div>
        ) : (
          <div ref={ganttRef} className="gantt-container" />
        )}
      </Card>

      {/* Dialogs */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        isLoading={deleteTask.isPending}
      />

      <PublishScheduleDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={handlePublish}
      />
    </div>
  );
};

export default FrappeGanttChart;