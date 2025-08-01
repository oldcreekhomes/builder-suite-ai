import React, { useRef, useMemo, useState, useEffect } from 'react';
import { 
  GanttComponent, 
  ColumnsDirective, 
  ColumnDirective,
  Inject, 
  Edit, 
  Selection, 
  Toolbar, 
  ContextMenu,
  EditSettingsModel 
} from '@syncfusion/ej2-react-gantt';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { toast } from '@/hooks/use-toast';
import { PublishScheduleDialog } from './PublishScheduleDialog';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule } = usePublishSchedule(projectId);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Simple data transformation with confirmation status for colors
  const ganttData = useMemo(() => {
    return tasks.map((task, index) => ({
      TaskID: task.id,
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      EndDate: new Date(task.end_date),
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      Predecessor: task.predecessor || null,
      ParentID: task.parent_id || null,
      Resources: task.resources || null,
      Confirmed: task.confirmed, // For color coding
    }));
  }, [tasks]);

  // Simple task field mapping
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    parentID: 'ParentID',
    resourceInfo: 'Resources',
  };

  // Resource field mapping
  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName',
    group: 'resourceGroup'
  };

  // Basic edit settings - enable everything
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any,
  };

  // Columns with Resources column
  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'TaskName', headerText: 'Task Name', width: 250, allowEditing: true },
    { field: 'StartDate', headerText: 'Start Date', width: 140, allowEditing: true },
    { field: 'EndDate', headerText: 'End Date', width: 140, allowEditing: true },
    { field: 'Duration', headerText: 'Duration', width: 110, allowEditing: true },
    { field: 'Progress', headerText: 'Progress', width: 110, allowEditing: true },
    { field: 'Predecessor', headerText: 'Dependency', width: 140, allowEditing: true },
    { field: 'Resources', headerText: 'Resources', width: 180, allowEditing: true }
  ];

  // Toolbar with custom Publish button
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 
    'ExpandAll', 'CollapseAll', 'Indent', 'Outdent',
    { text: 'Publish', id: 'publish', prefixIcon: 'e-export' }
  ];

  // CUSTOMIZATION 1: Handle custom toolbar clicks (Publish button)
  const handleToolbarClick = (args: any) => {
    if (args.item?.id === 'publish' || args.item?.text === 'Publish') {
      console.log('Publish button clicked!');
      setPublishDialogOpen(true);
    }
  };

  // CUSTOMIZATION 2: Handle taskbar colors based on confirmation status
  const handleQueryTaskbarInfo = (args: any) => {
    const confirmed = args.data?.Confirmed;
    
    if (confirmed === true) {
      // Green for confirmed tasks
      args.taskbarBgColor = '#22c55e'; // green-500
      args.taskbarBorderColor = '#16a34a'; // green-600
      args.progressBarBgColor = '#15803d'; // green-700
    } else if (confirmed === false) {
      // Red for denied tasks
      args.taskbarBgColor = '#ef4444'; // red-500
      args.taskbarBorderColor = '#dc2626'; // red-600
      args.progressBarBgColor = '#b91c1c'; // red-700
    } else {
      // Default blue for pending tasks
      args.taskbarBgColor = '#3b82f6'; // blue-500
      args.taskbarBorderColor = '#2563eb'; // blue-600
      args.progressBarBgColor = '#1d4ed8'; // blue-700
    }
  };

  // Simple action handler - let Syncfusion do its thing, then sync to database
  const handleActionComplete = (args: any) => {
    console.log('Action completed:', args.requestType, args.data);
    
    if (args.requestType === 'save' && args.data) {
      // Task was edited
      const taskData = args.data;
      updateTask.mutate({
        id: taskData.TaskID,
        task_name: taskData.TaskName,
        start_date: taskData.StartDate?.toISOString(),
        end_date: taskData.EndDate?.toISOString(),
        duration: taskData.Duration,
        progress: taskData.Progress,
        predecessor: taskData.Predecessor,
        parent_id: taskData.ParentID,
        resources: taskData.Resources,
      }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task updated successfully" });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
        }
      });
    }
    else if (args.requestType === 'add' && args.data) {
      // Task was added
      const taskData = args.data;
      createTask.mutate({
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate?.toISOString() || new Date().toISOString(),
        end_date: taskData.EndDate?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        parent_id: taskData.ParentID || null,
        resources: taskData.Resources || null,
        order_index: tasks.length,
      }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task created successfully" });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
        }
      });
    }
    else if (args.requestType === 'delete' && args.data) {
      // Task was deleted
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      deleteTask.mutate(taskData.TaskID, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task deleted successfully" });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
        }
      });
    }
  };

  if (isLoading || resourcesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading tasks</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <GanttComponent
        ref={ganttRef}
        id="gantt"
        dataSource={ganttData}
        taskFields={taskFields}
        resourceFields={resourceFields}
        resources={resources} // CUSTOMIZATION 3: Resources from your user/representative table
        editSettings={editSettings}
        columns={columns}
        toolbar={toolbarOptions}
        enableContextMenu={true}
        height="600px"
        toolbarClick={handleToolbarClick} // CUSTOMIZATION 1: Handle Publish button
        actionComplete={handleActionComplete}
        queryTaskbarInfo={handleQueryTaskbarInfo} // CUSTOMIZATION 2: Color coding
        allowSelection={true}
        gridLines="Both"
        timelineSettings={{
          timelineUnitSize: 40,
          topTier: {
            unit: 'Week',
            format: 'MMM dd, \'yy'
          },
          bottomTier: {
            unit: 'Day',
            format: 'dd'
          }
        }}
      >
        <Inject services={[Edit, Selection, Toolbar, ContextMenu]} />
      </GanttComponent>

      {/* CUSTOMIZATION 1: Publish Dialog */}
      <PublishScheduleDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={(data) => {
          console.log('Publishing schedule with data:', data);
          if (data.daysFromToday) {
            publishSchedule({
              daysFromToday: data.daysFromToday,
              message: data.message
            });
          }
        }}
      />
    </div>
  );
};