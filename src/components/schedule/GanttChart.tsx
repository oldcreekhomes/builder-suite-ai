import React, { useRef, useMemo } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu } from '@syncfusion/ej2-react-gantt';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { generateNestedHierarchy, findOriginalTaskId, ProcessedTask } from '@/utils/ganttUtils';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);

  // Transform tasks with nested hierarchical structure and comprehensive debugging
  const ganttData = useMemo(() => {
    console.log('=== GANTT DATA TRANSFORMATION START ===');
    console.log('Raw tasks from database:', tasks);
    console.log('Task count:', tasks.length);
    
    // Log parent-child relationships in raw data
    const parentChildMap = new Map();
    tasks.forEach(task => {
      if (task.parent_id) {
        if (!parentChildMap.has(task.parent_id)) {
          parentChildMap.set(task.parent_id, []);
        }
        parentChildMap.get(task.parent_id).push(task.id);
      }
    });
    console.log('Parent-child relationships in database:', Object.fromEntries(parentChildMap));
    
    const transformedData = generateNestedHierarchy(tasks);
    console.log('Transformed hierarchical data:', transformedData);
    console.log('=== GANTT DATA TRANSFORMATION END ===');
    
    return transformedData;
  }, [tasks]);

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    child: 'subtasks', // Use subtasks for nested hierarchy
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
  };

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll',
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 'Indent', 'Outdent'
  ];

  const splitterSettings = {
    columnIndex: 3
  };

  const projectStartDate = new Date('2024-01-01');
  const projectEndDate = new Date('2024-12-31');

  // Helper function to find parent task ID from hierarchical position
  const findParentFromHierarchy = (taskId: string, allTasks: ProcessedTask[]): string | null => {
    console.log(`Finding parent for task ID: ${taskId}`);
    
    const findParentRecursive = (tasks: ProcessedTask[], targetId: string): string | null => {
      for (const task of tasks) {
        if (task.subtasks) {
          // Check if target is a direct child
          for (const subtask of task.subtasks) {
            if (subtask.TaskID === targetId) {
              console.log(`Found parent: ${task.TaskID} (Original: ${task.OriginalTaskID}) for child: ${targetId}`);
              return task.OriginalTaskID;
            }
          }
          // Recursively check deeper levels
          const found = findParentRecursive(task.subtasks, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const parentId = findParentRecursive(allTasks, taskId);
    console.log(`Parent search result for ${taskId}:`, parentId);
    return parentId;
  };

  const handleActionBegin = (args: any) => {
    console.log('=== ACTION BEGIN ===');
    console.log('Request type:', args.requestType);
    console.log('Action data:', args.data);
    console.log('===================');
    
    if (args.requestType === 'beforeAdd') {
      console.log('Before adding new task:', args.data);
    } else if (args.requestType === 'beforeEdit') {
      console.log('Before editing task:', args.data);
    } else if (args.requestType === 'beforeDelete') {
      console.log('Before deleting task:', args.data);
    }
  };

  const handleActionComplete = (args: any) => {
    console.log('=== ACTION COMPLETE ===');
    console.log('Request type:', args.requestType);
    console.log('Action data:', args.data);
    console.log('Current gantt data structure:', ganttData);
    console.log('========================');
    
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      console.log('CREATING NEW TASK:', taskData);
      
      // Determine parent based on the task's position in hierarchy
      const parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
      console.log('Determined parent ID for new task:', parentId);
      
      const createParams = {
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate ? taskData.StartDate.toISOString() : new Date().toISOString(),
        end_date: taskData.EndDate ? taskData.EndDate.toISOString() : new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        resources: taskData.Resources || null,
        parent_id: parentId,
        order_index: tasks.length,
      };
      
      console.log('CREATE TASK PARAMS:', createParams);
      createTask.mutate(createParams);
    } 
    else if (args.requestType === 'save' && args.data) {
      const taskData = args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('UPDATING TASK:', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        const parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
        console.log('Determined parent ID for update:', parentId);
        
        const updateParams = {
          id: originalTaskId,
          task_name: taskData.TaskName,
          start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined,
          end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
          duration: taskData.Duration,
          progress: taskData.Progress,
          predecessor: taskData.Predecessor || null,
          resources: taskData.Resources,
          parent_id: parentId,
          order_index: taskData.OrderIndex,
        };
        
        console.log('UPDATE TASK PARAMS:', updateParams);
        updateTask.mutate(updateParams);
      }
    } 
    else if (args.requestType === 'delete' && args.data) {
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('DELETING TASK:', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        deleteTask.mutate(originalTaskId);
      }
    } 
    else if (args.requestType === 'indenting' && args.data) {
      console.log('INDENTING TASK (making it a child):', args.data);
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        const parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
        console.log('Indenting - setting parent_id to:', parentId);
        
        updateTask.mutate({
          id: originalTaskId,
          parent_id: parentId,
          order_index: taskData.OrderIndex || 0,
        });
      }
    } 
    else if (args.requestType === 'outdenting' && args.data) {
      console.log('OUTDENTING TASK (making it a parent/root):', args.data);
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        const parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
        console.log('Outdenting - setting parent_id to:', parentId);
        
        updateTask.mutate({
          id: originalTaskId,
          parent_id: parentId, // This might be null for root-level tasks
          order_index: taskData.OrderIndex || 0,
        });
      }
    }
  };

  const handleContextMenuClick = (args: any) => {
    console.log('Context menu clicked:', args.item.text, args);
  };

  const handleResizeStart = (args: any) => {
    console.log('Resize start:', args);
  };

  const handleResizing = (args: any) => {
    console.log('Resizing:', args);
  };

  const handleResizeStop = (args: any) => {
    console.log('Resize stop:', args);
  };

  const handleColumnMenuOpen = (args: any) => {
    console.log('Column menu opened:', args);
  };

  const handleColumnMenuClick = (args: any) => {
    console.log('Column menu clicked:', args);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading tasks</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Debug Panel - Remove in production */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg border">
        <h4 className="font-bold mb-2">Debug Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Raw Tasks Count:</strong> {tasks.length}
          </div>
          <div>
            <strong>Processed Tasks Count:</strong> {ganttData.length}
          </div>
          <div>
            <strong>Tasks with Parents:</strong> {tasks.filter(t => t.parent_id).length}
          </div>
          <div>
            <strong>Root Tasks:</strong> {ganttData.length}
          </div>
        </div>
        <div className="mt-2">
          <strong>Database Parent-Child Relationships:</strong>
          <pre className="text-xs bg-white p-2 rounded mt-1 max-h-32 overflow-auto">
            {JSON.stringify(
              tasks
                .filter(t => t.parent_id)
                .map(t => ({ id: t.id.slice(-8), parent: t.parent_id?.slice(-8), name: t.task_name })),
              null,
              2
            )}
          </pre>
        </div>
      </div>

      <GanttComponent
        ref={ganttRef}
        id="gantt"
        dataSource={ganttData}
        taskFields={taskFields}
        editSettings={editSettings}
        toolbar={toolbarOptions}
        enableContextMenu={true}
        contextMenuClick={handleContextMenuClick}
        splitterSettings={splitterSettings}
        height="600px"
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        resizeStart={handleResizeStart}
        resizing={handleResizing}
        resizeStop={handleResizeStop}
        allowSelection={true}
        allowResizing={true}
        showColumnMenu={true}
        columnMenuOpen={handleColumnMenuOpen}
        columnMenuClick={handleColumnMenuClick}
        gridLines="Both"
        timelineSettings={{
          timelineUnitSize: 60,
          topTier: {
            unit: 'Month',
            format: 'MMM yyyy'
          },
          bottomTier: {
            unit: 'Day',
            format: 'dd'
          }
        }}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" headerText="ID" width="80" allowResizing={true} />
          <ColumnDirective field="TaskName" headerText="Task Name" width="280" allowResizing={true} />
          <ColumnDirective field="StartDate" headerText="Start Date" width="140" allowResizing={true} />
          <ColumnDirective field="EndDate" headerText="End Date" width="140" allowResizing={true} />
          <ColumnDirective field="Duration" headerText="Duration" width="110" allowResizing={true} />
          <ColumnDirective field="Progress" headerText="Progress" width="110" allowResizing={true} />
          <ColumnDirective field="Predecessor" headerText="Dependency" width="140" allowResizing={true} />
          <ColumnDirective field="Resources" headerText="Resources" width="180" allowResizing={true} />
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu]} />
      </GanttComponent>
    </div>
  );
};
