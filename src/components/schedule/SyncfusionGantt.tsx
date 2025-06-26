
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
  ContextMenu
} from '@syncfusion/ej2-react-gantt';
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface SyncfusionGanttProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function SyncfusionGantt({ tasks, onTaskUpdate, projectId }: SyncfusionGanttProps) {
  // Transform our tasks to Syncfusion format
  const transformedTasks = tasks.map(task => ({
    TaskID: parseInt(task.task_code),
    TaskName: task.task_name,
    StartDate: new Date(task.start_date),
    EndDate: new Date(task.end_date),
    Duration: task.duration,
    Progress: task.progress,
    Resources: task.resources.join(', '),
    Predecessor: task.predecessor_id ? tasks.find(t => t.id === task.predecessor_id)?.task_code : null,
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

  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll', 'ZoomIn', 'ZoomOut', 'ZoomToFit'];

  const splitterSettings = {
    columnIndex: 4
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
        enableContextMenu={true}
        height="100%"
        splitterSettings={splitterSettings}
        projectStartDate={new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime())))}
        projectEndDate={new Date(Math.max(...tasks.map(t => new Date(t.end_date).getTime())))}
        timelineSettings={{
          topTier: {
            unit: 'Week',
            format: 'dd/MM/yyyy'
          },
          bottomTier: {
            unit: 'Day',
            count: 1
          }
        }}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" headerText="ID" width="70" />
          <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
          <ColumnDirective field="StartDate" headerText="Start Date" width="150" />
          <ColumnDirective field="Duration" headerText="Duration" width="100" />
          <ColumnDirective field="Progress" headerText="Progress" width="100" />
          <ColumnDirective field="Resources" headerText="Resources" width="200" />
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, Sort, Resize, ContextMenu]} />
      </GanttComponent>
    </div>
  );
}
