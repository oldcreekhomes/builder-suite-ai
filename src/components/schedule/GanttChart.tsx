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

  // BACK TO FLAT STRUCTURE - Hierarchical data breaks context menu
  const ganttData = useMemo(() => {
    if (!tasks.length) return [];
    
    return tasks.map((task, index) => ({
      TaskID: index + 1, // Simple sequential numbering
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      ParentID: task.parent_id ? tasks.findIndex(t => t.id === task.parent_id) + 1 : null,
      Predecessor: task.predecessor || null,
      Resources: task.resources || null,
      _originalId: task.id,
    }));
  }, [tasks]);

  // BACK TO FLAT STRUCTURE - Use ParentID for relationships
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    duration: 'Duration',
    progress: 'Progress',
    parentID: 'ParentID', // Use ParentID for flat structure
    dependency: 'Predecessor',
    resourceInfo: 'Resources'
  };

  // Standard edit settings with default task name
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any
  };

  // Set default values for new tasks using actionBegin event
  const handleActionBegin = (args: any) => {
    if (args.requestType === 'beforeAdd') {
      // Set default values for new tasks
      args.data = {
        TaskName: 'New Task',
        StartDate: new Date(),
        Duration: 1,
        Progress: 0,
        ...args.data // Keep any other data that might be set
      };
    }
  };

  // Standard toolbar - EXACTLY like their docs
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel',
    'ExpandAll', 'CollapseAll', 
    'Indent', 'Outdent'
  ];

  // Wider columns with better sizing
  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 100, minWidth: 80 },
    { field: 'TaskName', headerText: 'Task Name', width: 400, minWidth: 200 }, // Much wider
    { field: 'StartDate', headerText: 'Start Date', width: 150, minWidth: 120 },
    { field: 'Duration', headerText: 'Duration', width: 120, minWidth: 100 },
    { field: 'Progress', headerText: 'Progress', width: 120, minWidth: 100 },
    { field: 'Predecessor', headerText: 'Dependency', width: 150, minWidth: 120 },
    { field: 'Resources', headerText: 'Resources', width: 250, minWidth: 150 } // Much wider
  ];

  // Auto-fit columns when data loads - IMPROVED
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      // Multiple attempts to ensure auto-fit works
      const autoFit = () => {
        if (ganttRef.current) {
          ganttRef.current.autoFitColumns();
          console.log('Auto-fit columns applied');
        }
      };
      
      // Try multiple times with different delays
      setTimeout(autoFit, 100);
      setTimeout(autoFit, 500);
      setTimeout(autoFit, 1000);
    }
  }, [ganttData]);

  // ALSO auto-fit when component mounts
  useEffect(() => {
    if (ganttRef.current) {
      const autoFit = () => {
        if (ganttRef.current) {
          ganttRef.current.autoFitColumns();
        }
      };
      
      setTimeout(autoFit, 2000); // Give it time to fully render
    }
  }, []);

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
        allowColumnReorder={true} // Allow column reordering
        height="600px"
        gridLines="Both"
        actionBegin={handleActionBegin} // Set default values for new tasks
        splitterSettings={{ columnIndex: 4 }} // More space for grid columns
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