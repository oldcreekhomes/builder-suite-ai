import React, { useRef, useState, useEffect } from 'react';
import {
  GanttComponent, Inject, Selection, ColumnsDirective, ColumnDirective, Toolbar, DayMarkers, Edit, Filter, Sort, ContextMenu, EventMarkersDirective, EventMarkerDirective,
} from "@syncfusion/ej2-react-gantt";
import { supabase } from '@/integrations/supabase/client';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { PublishScheduleDialog } from './PublishScheduleDialog';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttInstance = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule } = usePublishSchedule(projectId);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean; taskData: any; taskName: string;
  }>({ isOpen: false, taskData: null, taskName: '' });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Transform database tasks to Syncfusion format
  const ganttData = React.useMemo(() => {
    if (!tasks.length) return [];
    
    return tasks.map((task) => {
      let resourceNames = null;
      if (task.resources && resources?.length) {
        const taskResourceIds = Array.isArray(task.resources) ? task.resources : [task.resources];
        resourceNames = taskResourceIds
          .map(id => {
            const resource = resources.find(r => r.resourceId === id);
            return resource?.resourceName;
          })
          .filter(Boolean)
          .join(', ');
      }

      return {
        TaskID: task.id,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration || 1,
        Progress: task.progress || 0,
        ParentID: task.parent_id,
        Predecessor: task.predecessor,
        Resources: resourceNames || task.resources,
        Confirmed: task.confirmed,
      };
    });
  }, [tasks, resources]);

  // Auto-fit columns after data loads
  useEffect(() => {
    if (ganttInstance.current) {
      const timer = setTimeout(() => ganttInstance.current?.autoFitColumns(), 200);
      return () => clearTimeout(timer);
    }
  }, [ganttData]);

  // Real-time email confirmation updates
  useEffect(() => {
    const channel = supabase
      .channel('schedule-task-updates')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'project_schedule_tasks',
        filter: `project_id=eq.${projectId}`
      }, () => ganttInstance.current?.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Color-coded taskbars based on email confirmations
  const handleQueryTaskbarInfo = (args: any) => {
    const confirmed = args.data?.Confirmed;
    if (confirmed === true || confirmed === 'true') {
      args.taskbarBgColor = '#22c55e'; args.taskbarBorderColor = '#16a34a'; args.progressBarBgColor = '#15803d';
    } else if (confirmed === false || confirmed === 'false') {
      args.taskbarBgColor = '#ef4444'; args.taskbarBorderColor = '#dc2626'; args.progressBarBgColor = '#b91c1c';
    } else {
      args.taskbarBgColor = '#3b82f6'; args.taskbarBorderColor = '#2563eb'; args.progressBarBgColor = '#1d4ed8';
    }
  };

  // Handle toolbar clicks
  const handleToolbarClick = (args: any) => {
    if (args.item?.id === 'publish') {
      setPublishDialogOpen(true);
    } else if (args.item?.id === 'gantt_add' || args.item?.text === 'Add') {
      args.cancel = true;
      ganttInstance.current?.addRecord({
        TaskName: 'New Task', StartDate: new Date(), Duration: 1, Progress: 0
      }, 'Bottom');
    }
  };

  // Handle actions
  const handleActionBegin = (args: any) => {
    if (args.requestType === 'beforeDelete') {
      args.cancel = true;
      const taskData = args.data[0];
      setDeleteConfirmation({ isOpen: true, taskData, taskName: taskData.TaskName || 'Unknown Task' });
    } else if (args.requestType === 'beforeOpenAddDialog') {
      args.cancel = true;
    }
  };

  // Database sync
  const handleActionComplete = (args: any) => {
    const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
    
    const createParams = {
      project_id: projectId, task_name: taskData.TaskName || 'New Task',
      start_date: taskData.StartDate?.toISOString() || new Date().toISOString(),
      end_date: taskData.EndDate?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
      duration: taskData.Duration || 1, progress: taskData.Progress || 0,
      parent_id: taskData.ParentID || null, predecessor: taskData.Predecessor || null,
      resources: taskData.Resources || null, order_index: tasks.length
    };

    const updateParams = {
      id: taskData.TaskID, task_name: taskData.TaskName,
      start_date: taskData.StartDate?.toISOString(), end_date: taskData.EndDate?.toISOString(),
      duration: taskData.Duration, progress: taskData.Progress, predecessor: taskData.Predecessor,
      resources: taskData.Resources, confirmed: taskData.Confirmed
    };

    const onSuccess = (msg: string) => toast({ title: "Success", description: msg });
    const onError = (error: any) => toast({ variant: "destructive", title: "Error", description: error.message });

    switch (args.requestType) {
      case 'add': 
        createTask.mutate(createParams, { onSuccess: () => onSuccess("Task created successfully"), onError });
        break;
      case 'save':
      case 'cellSave':
      case 'taskbarEdited':
        updateTask.mutate(updateParams, { onSuccess: () => onSuccess("Task updated successfully"), onError });
        break;
      case 'indented':
      case 'outdented':
        updateTask.mutate({ id: taskData.TaskID, parent_id: taskData.ParentID || null }, 
          { onSuccess: () => onSuccess("Task hierarchy updated"), onError });
        break;
    }
  };

  const handleDeleteConfirmation = () => {
    if (deleteConfirmation.taskData) {
      deleteTask.mutate(deleteConfirmation.taskData.TaskID, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task deleted successfully" });
          setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
          setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
        }
      });
    }
  };

  if (isLoading || resourcesLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-96 text-red-600">
      Error loading tasks: {error.message}
    </div>;
  }

  return (
    <div className="control-pane">
      <div className="control-section">
        <div className="col-lg-12">
          <DeleteConfirmationDialog
            open={deleteConfirmation.isOpen}
            onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}
            title="Delete Task"
            description={`Are you sure you want to delete "${deleteConfirmation.taskName}"?`}
            onConfirm={handleDeleteConfirmation}
            isLoading={deleteTask.isPending}
          />

          <GanttComponent
            id="EnableWbs" ref={ganttInstance} dataSource={ganttData} height="550px"
            taskFields={{
              id: "TaskID", name: "TaskName", startDate: "StartDate", endDate: "EndDate",
              duration: "Duration", progress: "Progress", dependency: "Predecessor",
              parentID: 'ParentID', resourceInfo: 'Resources'
            }}
            editSettings={{
              allowAdding: true, allowEditing: true, allowDeleting: true, allowTaskbarEditing: true,
              showDeleteConfirmDialog: false, mode: 'Auto', newRowPosition: 'Bottom'
            }}
            toolbar={["Add", "Edit", "Update", "Delete", "Cancel", "ExpandAll", "CollapseAll",
              { text: 'Publish Schedule', id: 'publish', prefixIcon: 'e-export' }]}
            timelineSettings={{
              showTooltip: true, topTier: { unit: "Week", format: "dd/MM/yyyy" },
              bottomTier: { unit: "Day", count: 1 }
            }}
            selectionSettings={{ mode: "Row", type: "Single", enableToggle: false }}
            splitterSettings={{ columnIndex: 4 }}
            labelSettings={{ taskLabel: '${Progress}%' }}
            tooltipSettings={{ showTooltip: true }}
            filterSettings={{ type: "Menu" }}
            projectStartDate={new Date()}
            projectEndDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            resourceFields={{ id: 'resourceId', name: 'resourceName' }}
            resources={resources}
            treeColumnIndex={2} allowSorting={true} enableContextMenu={true}
            addDialogFields={[]} enableWBS={true} enableAutoWbsUpdate={true}
            allowSelection={true} allowPdfExport={true} highlightWeekends={true}
            allowFiltering={false} gridLines="Both" taskbarHeight={20} rowHeight={40}
            allowResizing={true} allowUnscheduledTasks={true}
            toolbarClick={handleToolbarClick} actionBegin={handleActionBegin}
            actionComplete={handleActionComplete} queryTaskbarInfo={handleQueryTaskbarInfo}
          >
            <ColumnsDirective>
              <ColumnDirective field="TaskID" visible={false} />
              <ColumnDirective field="WBSCode" headerText="ID" width={60} minWidth={50} />
              <ColumnDirective field="TaskName" headerText="Task Name" allowReordering={false} width={200} minWidth={150} />
              <ColumnDirective field="StartDate" headerText="Start Date" width={110} minWidth={100} />
              <ColumnDirective field="Duration" headerText="Duration" allowEditing={false} width={80} minWidth={70} />
              <ColumnDirective field="EndDate" headerText="End Date" width={110} minWidth={100} />
              <ColumnDirective field="WBSPredecessor" headerText="Predecessor" width={100} minWidth={80} />
              <ColumnDirective field="Progress" headerText="Progress" width={80} minWidth={70} />
              <ColumnDirective field="Resources" headerText="Resources" width={120} minWidth={100} />
            </ColumnsDirective>
            
            <EventMarkersDirective>
              <EventMarkerDirective day={new Date()} label='Project Start'></EventMarkerDirective>
            </EventMarkersDirective>
            
            <Inject services={[Selection, DayMarkers, Toolbar, Edit, Filter, Sort, ContextMenu]} />
          </GanttComponent>

          <PublishScheduleDialog
            open={publishDialogOpen}
            onOpenChange={setPublishDialogOpen}
            onPublish={(data) => {
              if (data.daysFromToday) {
                publishSchedule({ daysFromToday: data.daysFromToday, message: data.message });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default GanttChart;