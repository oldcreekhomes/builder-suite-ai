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
          EndDate: new Date(task.end_date), // NATIVE: Include EndDate in data
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

  // Hierarchical task field mapping with EndDate
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    endDate: 'EndDate', // NATIVE: Add EndDate field mapping
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    child: 'subtasks' // Enable hierarchical structure
  };

  // Standard edit settings with NATIVE positioning and dialog control
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any, // NATIVE: Auto mode disables dialog for add
    newRowPosition: 'Bottom' as any // NATIVE: Add new rows at bottom
  };

  // Standard toolbar
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel',
    'ExpandAll', 'CollapseAll', 
    'Indent', 'Outdent'
  ];

  // Columns with NATIVE auto-sizing features
  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 'auto', minWidth: 80 }, // NATIVE: auto width
    { field: 'TaskName', headerText: 'Task Name', width: 'auto', minWidth: 200 }, // NATIVE: auto width
    { field: 'StartDate', headerText: 'Start Date', width: 'auto', minWidth: 120 }, // NATIVE: auto width
    { field: 'Duration', headerText: 'Duration', width: 'auto', minWidth: 100 }, // NATIVE: auto width
    { field: 'EndDate', headerText: 'End Date', width: 'auto', minWidth: 120 }, // NATIVE: auto width
    { field: 'Progress', headerText: 'Progress', width: 'auto', minWidth: 100 }, // NATIVE: auto width
    { field: 'Predecessor', headerText: 'Dependency', width: 'auto', minWidth: 120 }, // NATIVE: auto width
    { field: 'Resources', headerText: 'Resources', width: 'auto', minWidth: 150 } // NATIVE: auto width
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
        allowResizing={true} // NATIVE: Allow manual column resizing
        allowColumnReorder={true} // NATIVE: Allow column reordering
        autoFit={true} // NATIVE: Auto-fit columns to content
        height="600px"
        gridLines="Both"
        actionBegin={handleActionBegin}
        splitterSettings={{ columnIndex: 5 }} // Adjusted for new EndDate column
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