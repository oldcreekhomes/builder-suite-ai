import React, { useRef, useMemo, useEffect } from 'react';
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

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources } = useProjectResources();

  // Simple data transformation - numerical IDs
  const ganttData = useMemo(() => {
    return tasks.map((task, index) => ({
      TaskID: index + 1,
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      EndDate: new Date(task.end_date),  
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      Predecessor: task.predecessor || '',
      ParentID: task.parent_id ? tasks.findIndex(t => t.id === task.parent_id) + 1 : undefined,
      Resources: task.resources || '',
      OriginalID: task.id,
    }));
  }, [tasks]);

  // Standard task fields
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    parentID: 'ParentID',
    resourceInfo: 'Resources'
  };

  // Standard edit settings
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Dialog' as any, // Use dialog mode to prevent duplication
  };

  // Standard toolbar
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel',
    'ExpandAll', 'CollapseAll', 
    'Indent', 'Outdent'
  ];

  // Standard columns
  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 80 },
    { field: 'TaskName', headerText: 'Task Name', width: 300 },
    { field: 'StartDate', headerText: 'Start Date', width: 140 },
    { field: 'EndDate', headerText: 'End Date', width: 140 },
    { field: 'Duration', headerText: 'Duration', width: 100 },
    { field: 'Progress', headerText: 'Progress', width: 100 },
    { field: 'Predecessor', headerText: 'Dependency', width: 120 },
    { field: 'Resources', headerText: 'Resources', width: 200 }
  ];

  // Auto-fit columns
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      setTimeout(() => {
        ganttRef.current?.autoFitColumns();
      }, 100);
    }
  }, [ganttData]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="w-full h-full">
      <GanttComponent
        ref={ganttRef}
        id="gantt"
        dataSource={ganttData}
        taskFields={taskFields}
        resourceFields={{ id: 'resourceId', name: 'resourceName' }}
        resources={resources}
        editSettings={editSettings}
        toolbar={toolbarOptions}
        enableContextMenu={true}
        allowSelection={true}
        allowResizing={true}
        height="600px"
        gridLines="Both"
        timelineSettings={{
          topTier: { unit: 'Week' },
          bottomTier: { unit: 'Day' }
        }}
      >
        <ColumnsDirective>
          {columns.map(col => (
            <ColumnDirective key={col.field} {...col} />
          ))}
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, ContextMenu]} />
      </GanttComponent>
    </div>
  );
};