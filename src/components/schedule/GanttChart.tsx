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

  // BACK TO WORKING VERSION - Hierarchical numbering with proper parent mapping
  const ganttData = useMemo(() => {
    if (!tasks.length) return [];
    
    // Create proper hierarchical structure for display
    const buildHierarchy = (parentId: string | null = null, prefix: string = ''): any[] => {
      const children = tasks.filter(task => task.parent_id === parentId);
      
      return children.map((task, index) => {
        const taskNumber = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        const childTasks = buildHierarchy(task.id, taskNumber);
        
        return {
          TaskID: taskNumber, // Hierarchical numbering: 1, 1.1, 1.2, 2, 2.1, etc.
          TaskName: task.task_name,
          StartDate: new Date(task.start_date),
          Duration: task.duration || 1,
          Progress: task.progress || 0,
          Predecessor: task.predecessor || null,
          Resources: task.resources || null,
          subtasks: childTasks.length > 0 ? childTasks : undefined,
          _originalId: task.id,
        };
      });
    };
    
    return buildHierarchy();
  }, [tasks]);

  // Hierarchical task field mapping
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    child: 'subtasks' // Enable hierarchical structure
  };

  // Standard edit settings
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any
  };

  // Standard toolbar
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel',
    'ExpandAll', 'CollapseAll', 
    'Indent', 'Outdent'
  ];

  // Wider columns for better readability
  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 100, minWidth: 80 },
    { field: 'TaskName', headerText: 'Task Name', width: 400, minWidth: 200 },
    { field: 'StartDate', headerText: 'Start Date', width: 150, minWidth: 120 },
    { field: 'Duration', headerText: 'Duration', width: 120, minWidth: 100 },
    { field: 'Progress', headerText: 'Progress', width: 120, minWidth: 100 },
    { field: 'Predecessor', headerText: 'Dependency', width: 150, minWidth: 120 },
    { field: 'Resources', headerText: 'Resources', width: 250, minWidth: 150 }
  ];

  // Set default values for new tasks
  const handleActionBegin = (args: any) => {
    if (args.requestType === 'beforeAdd') {
      args.data = {
        TaskName: 'New Task',
        StartDate: new Date(),
        Duration: 1,
        Progress: 0,
        ...args.data
      };
    }
  };

  // Auto-fit columns when data loads
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      const autoFit = () => {
        if (ganttRef.current) {
          ganttRef.current.autoFitColumns();
        }
      };
      
      setTimeout(autoFit, 100);
      setTimeout(autoFit, 500);
      setTimeout(autoFit, 1000);
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
        allowColumnReorder={true}
        height="600px"
        gridLines="Both"
        actionBegin={handleActionBegin}
        splitterSettings={{ columnIndex: 4 }}
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