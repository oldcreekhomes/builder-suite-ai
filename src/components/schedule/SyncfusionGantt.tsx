
import React from "react";
import { 
  GanttComponent, 
  ColumnsDirective, 
  ColumnDirective, 
  Inject, 
  Edit, 
  Selection, 
  Toolbar, 
  DayMarkers,
  Sort,
  Resize,
  ContextMenu,
  Filter
} from '@syncfusion/ej2-react-gantt';
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface SyncfusionGanttProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function SyncfusionGantt({ tasks, onTaskUpdate, projectId }: SyncfusionGanttProps) {
  // Transform our tasks to Syncfusion format
  const transformedTasks = tasks.map((task, index) => ({
    TaskID: index + 1, // Use sequential IDs starting from 1
    TaskName: task.task_name,
    StartDate: new Date(task.start_date),
    EndDate: new Date(task.end_date),
    Duration: task.duration,
    Progress: task.progress,
    Resources: task.resources.join(', '),
    Predecessor: task.predecessor_id ? 
      tasks.findIndex(t => t.id === task.predecessor_id) + 1 : null,
    originalId: task.id
  }));

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources'
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true
  };

  const toolbar = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 
    'ExpandAll', 'CollapseAll', 'Search',
    'ZoomIn', 'ZoomOut', 'ZoomToFit'
  ];

  const splitterSettings = {
    columnIndex: 3
  };

  const labelSettings = {
    leftLabel: 'TaskName',
    rightLabel: 'Resources'
  };

  const projectStartDate = tasks.length > 0 ? 
    new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime()))) : 
    new Date();
    
  const projectEndDate = tasks.length > 0 ? 
    new Date(Math.max(...tasks.map(t => new Date(t.end_date).getTime()))) : 
    new Date();

  const timelineSettings = {
    showTooltip: true,
    topTier: {
      unit: 'Week' as any,
      format: 'dd/MM/yyyy'
    },
    bottomTier: {
      unit: 'Day' as any,
      count: 1
    }
  };

  const actionBegin = (args: any) => {
    console.log('Gantt action:', args.requestType);
  };

  const actionComplete = (args: any) => {
    console.log('Gantt action complete:', args.requestType);
    if (args.requestType === 'save' || args.requestType === 'delete') {
      onTaskUpdate();
    }
  };

  return (
    <div className="h-[600px] w-full">
      <GanttComponent
        id="gantt"
        dataSource={transformedTasks}
        taskFields={taskFields}
        editSettings={editSettings}
        toolbar={toolbar}
        allowSelection={true}
        allowResizing={true}
        allowSorting={true}
        allowFiltering={true}
        enableContextMenu={true}
        height="100%"
        width="100%"
        splitterSettings={splitterSettings}
        labelSettings={labelSettings}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        timelineSettings={timelineSettings}
        actionBegin={actionBegin}
        actionComplete={actionComplete}
        rowHeight={40}
        taskbarHeight={30}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" headerText="ID" width="70" />
          <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
          <ColumnDirective field="StartDate" headerText="Start Date" width="150" format="dd/MM/yyyy" />
          <ColumnDirective field="Duration" headerText="Duration" width="100" />
          <ColumnDirective field="Progress" headerText="Progress" width="100" />
          <ColumnDirective field="Resources" headerText="Resources" width="200" />
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, Sort, Resize, ContextMenu, Filter]} />
      </GanttComponent>
    </div>
  );
}
