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

  // Option 3: Direct DOM manipulation - more aggressive approach
  useEffect(() => {
    const updateHierarchicalNumbers = () => {
      console.log('Updating hierarchical numbers...');
      
      // Find all rows in the Gantt tree grid
      const rows = document.querySelectorAll('.e-gantt .e-treegrid .e-row');
      console.log('Found rows:', rows.length);
      
      let rootCounter = 0;
      const childCounters: { [key: number]: number } = {};
      
      rows.forEach((row, index) => {
        const level = row.getAttribute('aria-level');
        console.log(`Row ${index}: level ${level}`);
        
        // Try multiple selectors to find the ID cell
        let idCell = row.querySelector('.e-rowcell:first-child') || 
                    row.querySelector('[data-colindex="0"]') ||
                    row.querySelector('.e-treecell:first-child');
        
        if (level === '0') {
          // Root task
          rootCounter++;
          childCounters[rootCounter] = 0;
          if (idCell) {
            idCell.textContent = rootCounter.toString();
            console.log(`Set root task to: ${rootCounter}`);
          }
        } else if (level === '1') {
          // Child task
          childCounters[rootCounter] = (childCounters[rootCounter] || 0) + 1;
          if (idCell) {
            const hierarchicalId = `${rootCounter}.${childCounters[rootCounter]}`;
            idCell.textContent = hierarchicalId;
            console.log(`Set child task to: ${hierarchicalId}`);
          }
        }
      });
    };
    
    // Run multiple times to catch different render states
    const timers = [100, 500, 1000, 2000].map(delay => 
      setTimeout(updateHierarchicalNumbers, delay)
    );
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [ganttData]);

  // Also run when actions complete
  const handleActionComplete = (args: any) => {
    console.log('Action completed:', args.requestType);
    
    // Run the numbering update after any action
    setTimeout(() => {
      const updateEvent = new CustomEvent('updateNumbers');
      document.dispatchEvent(updateEvent);
    }, 200);
    
    // Keep the original database sync logic
    if (args.requestType === 'indented' && args.data) {
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = ganttData.find(t => t.TaskID === taskData.TaskID)?._originalId;
      
      let newParentOriginalId = null;
      if (taskData.ParentID) {
        newParentOriginalId = ganttData.find(t => t.TaskID === taskData.ParentID)?._originalId;
      }
      
      if (originalTaskId && updateTask) {
        updateTask.mutate({
          id: originalTaskId,
          parent_id: newParentOriginalId,
        });
      }
    }
    else if (args.requestType === 'outdented' && args.data) {
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = ganttData.find(t => t.TaskID === taskData.TaskID)?._originalId;
      
      let newParentOriginalId = null;
      if (taskData.ParentID) {
        newParentOriginalId = ganttData.find(t => t.TaskID === taskData.ParentID)?._originalId;
      }
      
      if (originalTaskId && updateTask) {
        updateTask.mutate({
          id: originalTaskId,
          parent_id: newParentOriginalId,
        });
      }
    }
  };

  // FALLBACK: Remove template, go back to basic version that renders
  const columns = [
    { 
      field: 'TaskID', 
      headerText: 'ID', 
      width: 'auto', 
      minWidth: 80
      // Removed template - go back to basic display
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
        actionComplete={handleActionComplete} // Option 3: DOM manipulation + database sync
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