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

  // SIMPLIFIED: Remove custom DisplayID, use standard structure
  const ganttData = useMemo(() => {
    if (!tasks.length) return [];
    
    // Create a mapping of original IDs to sequential IDs  
    const idMapping = new Map();
    tasks.forEach((task, index) => {
      idMapping.set(task.id, index + 1);
    });
    
    return tasks.map((task, index) => ({
      TaskID: index + 1, // Sequential ID for Syncfusion
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      EndDate: new Date(task.end_date),
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      ParentID: task.parent_id ? idMapping.get(task.parent_id) : null,
      Predecessor: task.predecessor || null,
      Resources: task.resources || null,
      _originalId: task.id,
    }));
  }, [tasks]);

  // FIXED: Use flat structure with ParentID for native hierarchical display
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    parentID: 'ParentID', // Use ParentID for flat structure relationships
    dependency: 'Predecessor',
    resourceInfo: 'Resources'
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

  // FINAL ATTEMPT: Use column template to override ID display completely
  const idColumnTemplate = (props: any) => {
    // Calculate hierarchical ID based on current data structure
    const calculateHierarchicalId = (taskId: number, parentId: number | null): string => {
      if (!parentId) {
        // Root task - find its position among root tasks
        const rootTasks = ganttData.filter(t => !t.ParentID);
        const rootIndex = rootTasks.findIndex(t => t.TaskID === taskId);
        return (rootIndex + 1).toString();
      } else {
        // Child task - get parent's ID and add child index
        const parentTask = ganttData.find(t => t.TaskID === parentId);
        const parentHierarchicalId = calculateHierarchicalId(parentId, parentTask?.ParentID || null);
        
        // Find this task's position among its siblings
        const siblings = ganttData.filter(t => t.ParentID === parentId);
        const childIndex = siblings.findIndex(t => t.TaskID === taskId);
        
        return `${parentHierarchicalId}.${childIndex + 1}`;
      }
    };
    
    const hierarchicalId = calculateHierarchicalId(props.TaskID, props.ParentID);
    return <span>{hierarchicalId}</span>;
  };

  // Columns with custom template for ID
  const columns = [
    { 
      field: 'TaskID', 
      headerText: 'ID', 
      width: 'auto', 
      minWidth: 80,
      template: idColumnTemplate // OVERRIDE: Custom template for hierarchical display
    },
    { field: 'TaskName', headerText: 'Task Name', width: 'auto', minWidth: 200 },
    { field: 'StartDate', headerText: 'Start Date', width: 'auto', minWidth: 120 },
    { field: 'Duration', headerText: 'Duration', width: 'auto', minWidth: 100 },
    { field: 'EndDate', headerText: 'End Date', width: 'auto', minWidth: 120 },
    { field: 'Progress', headerText: 'Progress', width: 'auto', minWidth: 100 },
    { field: 'Predecessor', headerText: 'Dependency', width: 'auto', minWidth: 120 },
    { field: 'Resources', headerText: 'Resources', width: 'auto', minWidth: 150 }
  ];

  // Set default values for new tasks AND handle database sync for indent/outdent
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

  // CRITICAL: Add database sync for indent/outdent operations
  const handleActionComplete = (args: any) => {
    console.log('Action completed:', args.requestType, args.data);
    
    if (args.requestType === 'indented' && args.data) {
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = ganttData.find(t => t.TaskID === taskData.TaskID)?._originalId;
      
      // Find the new parent's original ID
      let newParentOriginalId = null;
      if (taskData.ParentID) {
        newParentOriginalId = ganttData.find(t => t.TaskID === taskData.ParentID)?._originalId;
      }
      
      console.log('Indenting task:', originalTaskId, 'under parent:', newParentOriginalId);
      
      if (originalTaskId && updateTask) {
        updateTask.mutate({
          id: originalTaskId,
          parent_id: newParentOriginalId,
        }, {
          onSuccess: () => {
            console.log('✅ Indent saved to database');
          },
          onError: (error) => {
            console.error('❌ Indent failed:', error);
          }
        });
      }
    }
    else if (args.requestType === 'outdented' && args.data) {
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = ganttData.find(t => t.TaskID === taskData.TaskID)?._originalId;
      
      // Find the new parent's original ID after outdenting
      let newParentOriginalId = null;
      if (taskData.ParentID) {
        newParentOriginalId = ganttData.find(t => t.TaskID === taskData.ParentID)?._originalId;
      }
      
      console.log('Outdenting task:', originalTaskId, 'new parent:', newParentOriginalId);
      
      if (originalTaskId && updateTask) {
        updateTask.mutate({
          id: originalTaskId,
          parent_id: newParentOriginalId, // null for root level
        }, {
          onSuccess: () => {
            console.log('✅ Outdent saved to database');
          },
          onError: (error) => {
            console.error('❌ Outdent failed:', error);
          }
        });
      }
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
        showColumnMenu={true} // NATIVE: Enable hierarchical numbering in ID column
        height="600px"
        gridLines="Both"
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete} // CRITICAL: Save indent/outdent to database
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