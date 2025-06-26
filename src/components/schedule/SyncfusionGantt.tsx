
import React from "react";
import { GanttComponent, Inject, Selection, Edit, Toolbar, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-gantt';
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface SyncfusionGanttProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function SyncfusionGantt({ tasks, onTaskUpdate, projectId }: SyncfusionGanttProps) {
  // Transform our tasks to Syncfusion Gantt format
  const ganttData = tasks.map((task, index) => ({
    TaskID: index + 1,
    TaskName: task.task_name,
    StartDate: new Date(task.start_date),
    Duration: task.duration,
    Progress: task.progress,
    Predecessor: task.predecessor_id ? tasks.findIndex(t => t.id === task.predecessor_id) + 1 : null,
    taskId: task.id, // Keep original ID for updates
  }));

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
  };

  const labelSettings = {
    leftLabel: 'TaskName',
    rightLabel: 'Progress'
  };

  const editSettings = {
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true
  };

  const toolbarOptions = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll'];

  // Calculate project start and end dates from tasks
  const projectStartDate = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime())))
    : new Date();
    
  const projectEndDate = tasks.length > 0
    ? new Date(Math.max(...tasks.map(t => new Date(t.end_date).getTime())))
    : new Date();

  const handleActionComplete = (args: any) => {
    console.log('Gantt action completed:', args);
    // Trigger refresh when tasks are modified
    if (args.requestType === 'save' || args.requestType === 'delete') {
      onTaskUpdate();
    }
  };

  // Show loading state if no tasks
  if (tasks.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No tasks to display</p>
          <p className="text-sm text-gray-500">Add tasks to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <div className="w-full h-full rounded-lg border border-gray-200 overflow-hidden">
        <GanttComponent
          id="ProjectGantt"
          dataSource={ganttData}
          taskFields={taskFields}
          labelSettings={labelSettings}
          editSettings={editSettings}
          toolbar={toolbarOptions}
          height="100%"
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          actionComplete={handleActionComplete}
          allowSelection={true}
          allowReordering={true}
          allowResizing={true}
          allowSorting={true}
          gridLines="Both"
          timelineSettings={{
            topTier: {
              unit: 'Week',
              format: 'MMM dd, y',
            },
            bottomTier: {
              unit: 'Day',
              format: 'd',
            },
          }}
        >
          <ColumnsDirective>
            <ColumnDirective field='TaskID' headerText='ID' width='50' />
            <ColumnDirective field='TaskName' headerText='Task Name' width='250' />
            <ColumnDirective field='StartDate' headerText='Start Date' width='100' />
            <ColumnDirective field='Duration' headerText='Duration' width='80' />
            <ColumnDirective field='Progress' headerText='Progress' width='80' />
          </ColumnsDirective>
          <Inject services={[Selection, Edit, Toolbar]} />
        </GanttComponent>
      </div>
    </div>
  );
}
