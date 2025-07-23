import React, { useRef, useMemo, useState } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu, EditSettingsModel } from '@syncfusion/ej2-react-gantt';
import { Edit as TreeGridEdit } from '@syncfusion/ej2-react-treegrid';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { generateNestedHierarchy, findOriginalTaskId, ProcessedTask } from '@/utils/ganttUtils';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import '@/utils/syncfusionOverrides';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskData: any;
    taskName: string;
  }>({ isOpen: false, taskData: null, taskName: '' });

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

  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any, // Auto mode enables cell editing by double-clicking
    newRowPosition: 'Bottom' as any,
    showDeleteConfirmDialog: false // Disable Syncfusion's native delete confirmation
  };

  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'TaskName', headerText: 'Task Name', width: 250, allowEditing: true },
    { field: 'StartDate', headerText: 'Start Date', width: 140, allowEditing: true },
    { field: 'EndDate', headerText: 'End Date', width: 140, allowEditing: true },
    { field: 'Duration', headerText: 'Duration', width: 110, allowEditing: true },
    { field: 'Progress', headerText: 'Progress', width: 110, allowEditing: true },
    { field: 'Predecessor', headerText: 'Dependency', width: 140, allowEditing: true },
    { field: 'Resources', headerText: 'Resources', width: 180, allowEditing: true }
  ];

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll',
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 'Indent', 'Outdent'
  ];

  const splitterSettings = {
    columnIndex: 3
  };

  const projectStartDate = new Date(); // Use today's date
  const projectEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // One year from today

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
      // Cancel the native Syncfusion add dialog
      args.cancel = true;
      
      // Programmatically add a new row at the bottom with default values
      const newTask = {
        TaskName: 'New Task',
        StartDate: new Date(),
        EndDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        Duration: 1,
        Progress: 0,
        Resources: null,
        Predecessor: null
      };
      
      // Add the new record at the bottom of the tree
      if (ganttRef.current) {
        ganttRef.current.addRecord(newTask);
      }
      
      return;
    } else if (args.requestType === 'beforeEdit') {
      console.log('Before editing task:', args.data);
    } else if (args.requestType === 'beforeDelete') {
      console.log('Before deleting task:', args.data);
      // Cancel the default delete and show custom confirmation
      args.cancel = true;
      const taskData = args.data[0];
      setDeleteConfirmation({
        isOpen: true,
        taskData: taskData,
        taskName: taskData.TaskName || 'Unknown Task'
      });
    }
  };

  const handleDeleteConfirmation = () => {
    if (deleteConfirmation.taskData) {
      const taskData = deleteConfirmation.taskData;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('DELETING TASK:', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        deleteTask.mutate(originalTaskId, {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Task deleted successfully",
            });
            setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
          },
          onError: (error) => {
            console.error('Delete failed:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: `Failed to delete task: ${error.message}`,
            });
            setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
          }
        });
      }
    }
  };

  const handleActionComplete = (args: any) => {
    console.log('=== ACTION COMPLETE ===');
    console.log('Request type:', args.requestType);
    console.log('Action data:', args.data);
    console.log('Modified records:', args.modifiedRecords);
    console.log('Changed records:', args.changedRecords);
    console.log('Current gantt data structure:', ganttData);
    console.log('All event args:', args);
    console.log('========================');
    
    // CRITICAL: Cancel/prevent any default Syncfusion notification behavior
    if (args.requestType === 'delete' || args.requestType === 'save' || args.requestType === 'add') {
      console.log('Attempting to cancel default notification behavior');
      args.cancel = true; // Try to cancel any default behavior
      if (args.preventDefault) args.preventDefault();
      if (args.stopPropagation) args.stopPropagation();
    }
    
    // Add mutation error handling
    const handleMutationError = (error: any, operation: string) => {
      console.error(`${operation} failed:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${operation.toLowerCase()}: ${error.message}`,
      });
    };
    
    const handleMutationSuccess = (operation: string) => {
      console.log(`${operation} succeeded`);
      toast({
        title: "Success",
        description: `Task ${operation.toLowerCase()} successfully`,
      });
    };
    
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
      createTask.mutate(createParams, {
        onSuccess: () => handleMutationSuccess('Create'),
        onError: (error) => handleMutationError(error, 'Create')
      });
    } 
    else if ((args.requestType === 'save' || args.requestType === 'cellSave') && args.data) {
      const taskData = args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('UPDATING TASK (save/cellSave):', taskData, 'Original ID:', originalTaskId);
      
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
        updateTask.mutate(updateParams, {
          onSuccess: () => handleMutationSuccess('Update'),
          onError: (error) => handleMutationError(error, 'Update')
        });
      }
    }
    else if (args.requestType === 'taskbarEdited' && args.data) {
      console.log('TASKBAR EDITED:', args.data);
      const taskData = args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        const updateParams = {
          id: originalTaskId,
          start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined,
          end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
          duration: taskData.Duration,
          progress: taskData.Progress,
        };
        
        console.log('TASKBAR UPDATE PARAMS:', updateParams);
        updateTask.mutate(updateParams, {
          onSuccess: () => handleMutationSuccess('Update'),
          onError: (error) => handleMutationError(error, 'Update')
        });
      }
    }
    // Note: Delete handling is now moved to handleDeleteConfirmation via custom dialog
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
    else {
      console.log('UNHANDLED REQUEST TYPE:', args.requestType);
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
      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.taskName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmation}
        isLoading={deleteTask.isPending}
      />

      <GanttComponent
        ref={ganttRef}
        id="gantt"
        dataSource={ganttData}
        taskFields={taskFields}
        editSettings={editSettings}
        columns={columns}
        addDialogFields={[]}
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
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu, TreeGridEdit]} />
      </GanttComponent>
    </div>
  );
};
