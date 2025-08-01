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

  // CRITICAL FIX: Use the EXACT Syncfusion format from their docs
  const ganttData = useMemo(() => {
    if (!tasks.length) return [];
    
    // Create a mapping for parent relationships
    const taskMap = new Map();
    tasks.forEach((task, index) => {
      taskMap.set(task.id, index + 1);
    });
    
    return tasks.map((task, index) => ({
      TaskID: index + 1, // Sequential numerical ID starting from 1
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      ParentID: task.parent_id ? taskMap.get(task.parent_id) : null, // Map parent UUID to numerical ID
      Predecessor: task.predecessor || null,
      Resources: task.resources || null,
      // Store original UUID for database operations
      _originalId: task.id,
    }));
  }, [tasks]);

  // Standard Syncfusion task field mapping - EXACTLY like their docs
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    duration: 'Duration',
    progress: 'Progress',
    parentID: 'ParentID', // CRITICAL: This must match exactly
    dependency: 'Predecessor',
    resourceInfo: 'Resources'
  };

  // Standard edit settings - EXACTLY like their docs  
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any
  };

  // Standard toolbar - EXACTLY like their docs
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
        enableContextMenu={true} // CRITICAL: Enable context menu
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