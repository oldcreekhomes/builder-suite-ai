import { useEffect, useRef, useState } from "react";
import { GanttComponent, Inject, Edit, Selection, Toolbar, DayMarkers, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-gantt';
import { ProjectTask, useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useAuth } from "@/hooks/useAuth";
import { usePublishSchedule } from "@/hooks/usePublishSchedule";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface SyncfusionGanttChartProps {
  projectId: string;
}

export function SyncfusionGanttChart({ projectId }: SyncfusionGanttChartProps) {
  const { user } = useAuth();
  const { data: tasks, isLoading, error, refetch } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { publishSchedule, isLoading: isPublishing } = usePublishSchedule(projectId);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  
  const ganttRef = useRef<GanttComponent>(null);

  // Transform tasks for Syncfusion format
  const transformedTasks = tasks?.map(task => ({
    TaskID: task.id,
    TaskName: task.task_name,
    StartDate: new Date(task.start_date),
    EndDate: new Date(task.end_date),
    Duration: task.duration,
    Progress: task.progress,
    Predecessor: task.predecessor || "",
    Resources: task.resources || "",
    ParentId: task.parent_id || null,
    confirmed: task.confirmed,
    // Add custom class based on confirmation status
    customClass: task.confirmed === true ? 'confirmed-task' : 
                 task.confirmed === false ? 'denied-task' : 'pending-task'
  })) || [];

  // Gantt settings
  const taskSettings = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    parentID: 'ParentId',
    child: 'subtasks'
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: false
  };

  const toolbarOptions = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll'];

  // Handle real-time updates for task confirmations
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('task-confirmations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_schedule_tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Task confirmation update received:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, refetch]);

  // Custom styling for task status
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .e-gantt .confirmed-task {
        background-color: #10b981 !important;
      }
      .e-gantt .denied-task {
        background-color: #ef4444 !important;
      }
      .e-gantt .pending-task {
        background-color: #3b82f6 !important;
      }
      .e-gantt .e-taskbar-main-container .e-taskbar-main {
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleTaskAdd = () => {
    const newTask = {
      project_id: projectId,
      task_name: "New Task",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 1,
      progress: 0,
      resources: "",
      predecessor: "",
      parent_id: null,
    };
    
    createTask.mutate(newTask);
  };

  const handleTaskDelete = () => {
    if (selectedTaskId) {
      deleteTask.mutate(selectedTaskId);
      setShowDeleteDialog(false);
      setSelectedTaskId(null);
    }
  };

  const handlePublish = () => {
    setShowPublishDialog(true);
  };

  // Syncfusion event handlers
  const actionBegin = (args: any) => {
    if (args.requestType === 'beforeAdd') {
      const newTask = {
        project_id: projectId,
        task_name: args.data.TaskName || "New Task",
        start_date: args.data.StartDate?.toISOString() || new Date().toISOString(),
        end_date: args.data.EndDate?.toISOString() || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: args.data.Duration || 1,
        progress: args.data.Progress || 0,
        resources: args.data.Resources || "",
        predecessor: args.data.Predecessor || "",
        parent_id: args.data.ParentId || null,
      };
      
      createTask.mutate(newTask);
      args.cancel = true; // Cancel the default add action
    }
    
    if (args.requestType === 'beforeDelete') {
      if (args.data && args.data.length > 0) {
        setSelectedTaskId(args.data[0].TaskID);
        setShowDeleteDialog(true);
      }
      args.cancel = true; // Cancel the default delete action
    }
  };

  const actionComplete = (args: any) => {
    if (args.requestType === 'save' && args.data) {
      const updates = {
        task_name: args.data.TaskName,
        start_date: args.data.StartDate?.toISOString(),
        end_date: args.data.EndDate?.toISOString(),
        duration: args.data.Duration,
        progress: args.data.Progress,
        resources: args.data.Resources,
        predecessor: args.data.Predecessor,
        parent_id: args.data.ParentId,
      };
      
      updateTask.mutate({ id: args.data.TaskID, ...updates });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        <Card className="p-4">
          <Skeleton className="h-96 w-full" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-destructive mb-4">Failed to load schedule</div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleTaskAdd} className="h-9">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="outline"
            disabled={!selectedTaskId}
            className="h-9"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={() => refetch()} variant="outline" className="h-9">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={handlePublish} 
            variant="default" 
            disabled={isPublishing || !transformedTasks.length}
            className="h-9"
          >
            <Send className="w-4 h-4 mr-2" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="overflow-hidden">
        {transformedTasks.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tasks in schedule</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first task to the project schedule.
            </p>
            <Button onClick={handleTaskAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Task
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <GanttComponent
              ref={ganttRef}
              id="gantt"
              dataSource={transformedTasks}
              taskFields={taskSettings}
              editSettings={editSettings}
              toolbar={toolbarOptions}
              actionBegin={actionBegin}
              actionComplete={actionComplete}
              height="600px"
              projectStartDate={new Date()}
              projectEndDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
              timelineSettings={{
                timelineViewMode: 'Week',
                timelineUnitSize: 60,
                topTier: {
                  unit: 'Week',
                  format: 'MMM dd, y'
                },
                bottomTier: {
                  unit: 'Day',
                  format: 'dd'
                }
              }}
              splitterSettings={{
                columnIndex: 3,
                position: '30%'
              }}
              gridLines="Both"
              allowSelection={true}
              allowRowDragAndDrop={true}
              rowSelected={(args: any) => {
                setSelectedTaskId(args.data?.TaskID || null);
              }}
            >
              <ColumnsDirective>
                <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
                <ColumnDirective field="StartDate" headerText="Start Date" format="yMd" />
                <ColumnDirective field="EndDate" headerText="End Date" format="yMd" />
                <ColumnDirective field="Duration" headerText="Duration" />
                <ColumnDirective field="Progress" headerText="Progress" />
                <ColumnDirective field="Resources" headerText="Resources" />
              </ColumnsDirective>
              <Inject services={[Edit, Selection, Toolbar, DayMarkers]} />
            </GanttComponent>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Denied</span>
        </div>
      </div>

      {/* Dialogs */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={handleTaskDelete}
        isLoading={deleteTask.isPending}
      />

      <PublishScheduleDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onPublish={(data) => {
          publishSchedule({ daysFromToday: data.daysFromToday || "1", message: data.message });
          setShowPublishDialog(false);
        }}
      />
    </div>
  );
}