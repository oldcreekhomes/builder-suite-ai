import React, { useRef, useMemo, useEffect, useCallback } from 'react';
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

  // Simplified data transformation - keep original IDs
  const ganttData = useMemo(() => {
    if (!tasks.length) return [];
    
    return tasks.map((task) => ({
      TaskID: task.id, // Use original ID instead of sequential
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      EndDate: new Date(task.end_date),
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      ParentID: task.parent_id || null,
      Predecessor: task.predecessor || null,
      Resources: task.resources || null,
      // Keep original data for reference
      _originalTask: task
    }));
  }, [tasks]);

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    parentID: 'ParentID',
    dependency: 'Predecessor',
    resourceInfo: 'Resources'
  };

  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any,
    newRowPosition: 'Bottom' as any
  };

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel',
    'ExpandAll', 'CollapseAll', 
    'Indent', 'Outdent'
  ];

  const columns = [
    { 
      field: 'TaskID', 
      headerText: 'ID', 
      width: 80,
      isPrimaryKey: true
    },
    { field: 'TaskName', headerText: 'Task Name', width: 250 },
    { field: 'StartDate', headerText: 'Start Date', width: 120 },
    { field: 'Duration', headerText: 'Duration', width: 100 },
    { field: 'EndDate', headerText: 'End Date', width: 120 },
    { field: 'Progress', headerText: 'Progress', width: 100 },
    { field: 'Predecessor', headerText: 'Dependency', width: 120 },
    { field: 'Resources', headerText: 'Resources', width: 150 }
  ];

  // Handle before actions (validation, defaults)
  const handleActionBegin = useCallback((args: any) => {
    console.log('Action begin:', args.requestType, args);

    if (args.requestType === 'beforeAdd') {
      // Set defaults for new tasks
      args.data = {
        TaskName: 'New Task',
        StartDate: new Date(),
        Duration: 1,
        Progress: 0,
        ...args.data
      };
    }

    if (args.requestType === 'beforeEdit') {
      // Add any validation logic here
      console.log('Editing task:', args.data);
    }

    if (args.requestType === 'beforeDelete') {
      // Add confirmation logic if needed
      console.log('Deleting task:', args.data);
    }
  }, []);

  // Handle completed actions (database sync)
  const handleActionComplete = useCallback((args: any) => {
    console.log('Action completed:', args.requestType, args);

    try {
      switch (args.requestType) {
        case 'add':
          if (args.data && createTask) {
            const newTask = args.data;
            createTask.mutate({
              task_name: newTask.TaskName,
              start_date: newTask.StartDate,
              end_date: newTask.EndDate,
              duration: newTask.Duration,
              progress: newTask.Progress,
              parent_id: newTask.ParentID,
              predecessor: newTask.Predecessor,
              resources: newTask.Resources
            }, {
              onSuccess: (response) => {
                console.log('✅ Task created successfully:', response);
              },
              onError: (error) => {
                console.error('❌ Task creation failed:', error);
                // Optionally revert the UI change
              }
            });
          }
          break;

        case 'edit':
          if (args.data && updateTask) {
            const updatedTask = args.data;
            updateTask.mutate({
              id: updatedTask.TaskID,
              task_name: updatedTask.TaskName,
              start_date: updatedTask.StartDate,
              end_date: updatedTask.EndDate,
              duration: updatedTask.Duration,
              progress: updatedTask.Progress,
              parent_id: updatedTask.ParentID,
              predecessor: updatedTask.Predecessor,
              resources: updatedTask.Resources
            }, {
              onSuccess: () => {
                console.log('✅ Task updated successfully');
              },
              onError: (error) => {
                console.error('❌ Task update failed:', error);
              }
            });
          }
          break;

        case 'delete':
          if (args.data && deleteTask) {
            const deletedTask = Array.isArray(args.data) ? args.data[0] : args.data;
            deleteTask.mutate(deletedTask.TaskID, {
              onSuccess: () => {
                console.log('✅ Task deleted successfully');
              },
              onError: (error) => {
                console.error('❌ Task deletion failed:', error);
              }
            });
          }
          break;

        case 'indented':
          if (args.data && updateTask) {
            const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
            updateTask.mutate({
              id: taskData.TaskID,
              parent_id: taskData.ParentID
            }, {
              onSuccess: () => {
                console.log('✅ Task indented successfully');
              },
              onError: (error) => {
                console.error('❌ Task indent failed:', error);
              }
            });
          }
          break;

        case 'outdented':
          if (args.data && updateTask) {
            const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
            updateTask.mutate({
              id: taskData.TaskID,
              parent_id: taskData.ParentID // Will be null for root level
            }, {
              onSuccess: () => {
                console.log('✅ Task outdented successfully');
              },
              onError: (error) => {
                console.error('❌ Task outdent failed:', error);
              }
            });
          }
          break;

        default:
          console.log('Unhandled action type:', args.requestType);
      }
    } catch (error) {
      console.error('Error handling action:', error);
    }
  }, [createTask, updateTask, deleteTask]);

  // Auto-fit columns when data loads
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      const timer = setTimeout(() => {
        ganttRef.current?.autoFitColumns();
      }, 100);
      
      return () => clearTimeout(timer);
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
        actionComplete={handleActionComplete}
        splitterSettings={{ columnIndex: 4 }}
        timelineSettings={{
          topTier: { unit: 'Week', format: 'MMM dd, yyyy' },
          bottomTier: { unit: 'Day', format: 'd' }
        }}
        // Enable hierarchical display
        treeColumnIndex={1}
        showColumnMenu={true}
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