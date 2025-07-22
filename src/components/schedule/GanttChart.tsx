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

  // Transform tasks with nested hierarchical structure
  const ganttData = useMemo(() => {
    return generateNestedHierarchy(tasks);
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
    child: 'subtasks', // Use subtasks for nested hierarchy instead of parentID
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

  // Helper function to determine parent ID from hierarchical structure
  const getParentIdFromHierarchy = (taskId: string, allTasks: ProcessedTask[]): string | null => {
    const findParent = (tasks: ProcessedTask[], targetId: string): string | null => {
      for (const task of tasks) {
        if (task.subtasks) {
          for (const subtask of task.subtasks) {
            if (subtask.TaskID === targetId) {
              return task.OriginalTaskID;
            }
          }
          const found = findParent(task.subtasks, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findParent(allTasks, taskId);
  };

  const handleActionBegin = (args: any) => {
    console.log('Action begin:', args.requestType, args);
    
    if (args.requestType === 'beforeAdd') {
      console.log('Adding new task:', args.data);
    } else if (args.requestType === 'beforeEdit') {
      console.log('Editing task:', args.data);
    } else if (args.requestType === 'beforeDelete') {
      console.log('Deleting task:', args.data);
    }
  };

  const handleActionComplete = (args: any) => {
    console.log('Action complete:', args.requestType, args);
    
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      console.log('Creating new task with data:', taskData);
      
      // Determine parent based on the task's position in hierarchy
      const parentId = getParentIdFromHierarchy(taskData.TaskID, ganttData);
      
      createTask.mutate({
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
      });
    } else if (args.requestType === 'save' && args.data) {
      const taskData = args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('Updating task with data:', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        const parentId = getParentIdFromHierarchy(taskData.TaskID, ganttData);
        
        updateTask.mutate({
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
        });
      }
    } else if (args.requestType === 'delete' && args.data) {
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      if (originalTaskId) {
        deleteTask.mutate(originalTaskId);
      }
    } else if (args.requestType === 'indenting' || args.requestType === 'outdenting') {
      // Handle indent/outdent operations
      console.log('Task hierarchy changed:', args);
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        const parentId = getParentIdFromHierarchy(taskData.TaskID, ganttData);
        
        updateTask.mutate({
          id: originalTaskId,
          parent_id: parentId,
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
