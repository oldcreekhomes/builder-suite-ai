
import React, { useEffect, useRef } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Edit, Selection, Toolbar, DayMarkers } from '@syncfusion/ej2-react-gantt';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { registerLicense } from '@syncfusion/ej2-base';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);

  useEffect(() => {
    // Register Syncfusion license
    const licenseKey = 'Ngo9BigBOggjHTQxAR8/V1NDaF1cWWhIfEx1RHxQdld5ZFRHallYTnNWUj0eQnxTdEFiWH9YcnZXRmhcUkVzWQ==';
    registerLicense(licenseKey);
  }, []);

  // Transform tasks for Syncfusion Gantt format
  const ganttData = tasks.map((task: ProjectTask) => ({
    TaskID: task.id,
    TaskName: task.task_name,
    StartDate: new Date(task.start_date),
    EndDate: new Date(task.end_date),
    Duration: task.duration,
    Progress: task.progress,
    Predecessor: task.predecessor,
    Resources: task.resources,
    ParentID: task.parent_id,
    OrderIndex: task.order_index,
  }));

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    parentID: 'ParentID',
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
  };

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll',
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 'PrevTimeSpan', 'NextTimeSpan'
  ];

  const splitterSettings = {
    columnIndex: 3
  };

  const projectStartDate = new Date('2024-01-01');
  const projectEndDate = new Date('2024-12-31');

  const handleActionBegin = (args: any) => {
    console.log('Action begin:', args.requestType, args);
    
    if (args.requestType === 'beforeAdd') {
      console.log('Adding new task:', args.data);
    } else if (args.requestType === 'beforeEdit') {
      console.log('Editing task:', args.data);
    } else if (args.requestType === 'beforeDelete') {
      console.log('Deleting task:', args.data);
    }
  };

  const handleActionComplete = (args: any) => {
    console.log('Action complete:', args.requestType, args);
    
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      createTask.mutate({
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate ? taskData.StartDate.toISOString() : new Date().toISOString(),
        end_date: taskData.EndDate ? taskData.EndDate.toISOString() : new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        resources: taskData.Resources || null,
        parent_id: taskData.ParentID || null,
        order_index: tasks.length,
      });
    } else if (args.requestType === 'save' && args.data) {
      const taskData = args.data;
      updateTask.mutate({
        id: taskData.TaskID,
        task_name: taskData.TaskName,
        start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined,
        end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
        duration: taskData.Duration,
        progress: taskData.Progress,
        predecessor: taskData.Predecessor,
        resources: taskData.Resources,
        parent_id: taskData.ParentID,
        order_index: taskData.OrderIndex,
      });
    } else if (args.requestType === 'delete' && args.data) {
      deleteTask.mutate(args.data[0].TaskID);
    }
  };

  if (isLoading) {
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
        editSettings={editSettings}
        toolbar={toolbarOptions}
        splitterSettings={splitterSettings}
        height="600px"
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        allowSelection={true}
        gridLines="Both"
        timelineSettings={{
          timelineUnitSize: 60,
          topTier: {
            unit: 'Month',
            format: 'MMM yyyy'
          },
          bottomTier: {
            unit: 'Day',
            format: 'dd'
          }
        }}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" headerText="ID" width="70" />
          <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
          <ColumnDirective field="StartDate" headerText="Start Date" width="120" />
          <ColumnDirective field="EndDate" headerText="End Date" width="120" />
          <ColumnDirective field="Duration" headerText="Duration" width="100" />
          <ColumnDirective field="Progress" headerText="Progress" width="100" />
          <ColumnDirective field="Predecessor" headerText="Dependency" width="120" />
          <ColumnDirective field="Resources" headerText="Resources" width="150" />
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, DayMarkers]} />
      </GanttComponent>
    </div>
  );
};
