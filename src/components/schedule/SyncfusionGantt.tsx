
import React, { useRef, useEffect } from "react";
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
  const ganttRef = useRef<GanttComponent>(null);

  // Transform our tasks to Syncfusion format with proper validation
  const transformedTasks = tasks.map((task, index) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    
    // Ensure valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(`Invalid dates for task ${task.task_name}`);
      return null;
    }

    return {
      TaskID: index + 1,
      TaskName: task.task_name || `Task ${index + 1}`,
      StartDate: startDate,
      EndDate: endDate,
      Duration: Math.max(1, task.duration || 1),
      Progress: Math.min(100, Math.max(0, task.progress || 0)),
      Resources: task.resources ? task.resources.join(', ') : '',
      Predecessor: task.predecessor_id ? 
        tasks.findIndex(t => t.id === task.predecessor_id) + 1 : null,
      originalId: task.id
    };
  }).filter(Boolean); // Remove null entries

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

  // Calculate project dates with fallbacks
  const now = new Date();
  const projectStartDate = transformedTasks.length > 0 ? 
    new Date(Math.min(...transformedTasks.map(t => t.StartDate.getTime()))) : 
    now;
    
  const projectEndDate = transformedTasks.length > 0 ? 
    new Date(Math.max(...transformedTasks.map(t => t.EndDate.getTime()))) : 
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

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

  const created = () => {
    console.log('Gantt component created successfully');
  };

  const load = () => {
    console.log('Gantt component loading...');
  };

  // Handle component cleanup
  useEffect(() => {
    return () => {
      if (ganttRef.current) {
        try {
          ganttRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Gantt component:', error);
        }
      }
    };
  }, []);

  // Show loading state if no valid tasks
  if (transformedTasks.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No valid tasks to display</p>
          <p className="text-sm text-gray-500">Add tasks with valid dates to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <GanttComponent
        ref={ganttRef}
        id={`gantt-${projectId}`}
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
        created={created}
        load={load}
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
