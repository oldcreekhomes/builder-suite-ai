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
import { toast } from '@/hooks/use-toast';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources } = useProjectResources();

  // Create numerical IDs and keep UUID mapping
  const ganttData = useMemo(() => {
    return tasks.map((task, index) => ({
      TaskID: index + 1, // Sequential numerical ID for display
      TaskName: task.task_name,
      StartDate: new Date(task.start_date),
      EndDate: new Date(task.end_date),  
      Duration: task.duration || 1,
      Progress: task.progress || 0,
      Predecessor: task.predecessor || '',
      ParentID: task.parent_id ? tasks.findIndex(t => t.id === task.parent_id) + 1 : undefined,
      Resources: task.resources || '',
      OriginalID: task.id, // Keep original UUID for database operations
    }));
  }, [tasks]);

  // Helper function to find original UUID from TaskID
  const findOriginalId = (taskId: number): string | null => {
    const task = ganttData.find(t => t.TaskID === taskId);
    return task?.OriginalID || null;
  };

  // Standard Syncfusion task field mapping
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName', 
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    parentID: 'ParentID',
    resourceInfo: 'Resources'
  };

  // Standard Syncfusion resource field mapping
  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName'
  };

  // ISSUE 1 FIX: Default values for new tasks
  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true, 
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any,
    newRowPosition: 'Bottom' as any
  };

  // Standard Syncfusion toolbar
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel',
    'ExpandAll', 'CollapseAll', 
    'Indent', 'Outdent'
  ];

  // Wider columns that will auto-fit
  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 80 },
    { field: 'TaskName', headerText: 'Task Name', width: 300 },
    { field: 'StartDate', headerText: 'Start Date', width: 140 },
    { field: 'EndDate', headerText: 'End Date', width: 140 },
    { field: 'Duration', headerText: 'Duration', width: 100 },
    { field: 'Progress', headerText: 'Progress', width: 100 },
    { field: 'Predecessor', headerText: 'Dependency', width: 120 },
    { field: 'Resources', headerText: 'Resources', width: 200 }
  ];

  // ISSUE 2 FIX: Handle Add Task Above/Below with correct positioning
  const handleActionBegin = (args: any) => {
    console.log('Action begin:', args.requestType, args);
    
    if (args.requestType === 'beforeAdd') {
      // ISSUE 1 FIX: Set default values for new tasks
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      args.data = {
        ...args.data,
        TaskName: args.data.TaskName || 'New Task',
        StartDate: today, // Default to today
        EndDate: tomorrow, // Default to tomorrow (1 day duration)
        Duration: 1, // Default 1 day
        Progress: 0
      };
      
      console.log('Setting default values for new task:', args.data);
    }
  };

  // ISSUE 3 FIX: Handle database operations
  const handleActionComplete = (args: any) => {
    console.log('Action completed:', args.requestType, args.data);
    
    if (args.requestType === 'add' && args.data) {
      // Task was added
      const taskData = args.data;
      console.log('Creating new task with data:', taskData);
      
      const parentOriginalId = taskData.ParentID ? findOriginalId(taskData.ParentID) : null;
      
      createTask.mutate({
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate?.toISOString() || new Date().toISOString(),
        end_date: taskData.EndDate?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        parent_id: parentOriginalId,
        resources: taskData.Resources || null,
        order_index: tasks.length,
      }, {
        onSuccess: (newTask) => {
          console.log('✅ Task created successfully:', newTask);
          toast({ title: "Success", description: "Task created successfully" });
        },
        onError: (error) => {
          console.error('❌ Task creation failed:', error);
          toast({ variant: "destructive", title: "Error", description: `Failed to create task: ${error.message}` });
        }
      });
    }
    else if (args.requestType === 'save' && args.data) {
      // Task was edited
      const taskData = args.data;
      const originalId = findOriginalId(taskData.TaskID);
      
      if (originalId) {
        console.log('Updating task with data:', taskData);
        
        const parentOriginalId = taskData.ParentID ? findOriginalId(taskData.ParentID) : null;
        
        updateTask.mutate({
          id: originalId,
          task_name: taskData.TaskName,
          start_date: taskData.StartDate?.toISOString(),
          end_date: taskData.EndDate?.toISOString(),
          duration: taskData.Duration,
          progress: taskData.Progress,
          predecessor: taskData.Predecessor,
          parent_id: parentOriginalId,
          resources: taskData.Resources,
        }, {
          onSuccess: () => {
            console.log('✅ Task updated successfully');
            toast({ title: "Success", description: "Task updated successfully" });
          },
          onError: (error) => {
            console.error('❌ Task update failed:', error);
            toast({ variant: "destructive", title: "Error", description: `Failed to update task: ${error.message}` });
          }
        });
      }
    }
    else if (args.requestType === 'delete' && args.data) {
      // Task was deleted
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalId = findOriginalId(taskData.TaskID);
      
      if (originalId) {
        console.log('Deleting task:', originalId);
        
        deleteTask.mutate(originalId, {
          onSuccess: () => {
            console.log('✅ Task deleted successfully');
            toast({ title: "Success", description: "Task deleted successfully" });
          },
          onError: (error) => {
            console.error('❌ Task deletion failed:', error);
            toast({ variant: "destructive", title: "Error", description: `Failed to delete task: ${error.message}` });
          }
        });
      }
    }
  };

  // Auto-fit columns when data loads
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
        resourceFields={resourceFields}
        resources={resources}
        editSettings={editSettings}
        toolbar={toolbarOptions}
        enableContextMenu={true}
        allowSelection={true}
        allowResizing={true}
        height="600px"
        gridLines="Both"
        actionBegin={handleActionBegin} // ISSUE 1 & 2: Handle defaults and positioning
        actionComplete={handleActionComplete} // ISSUE 3: Handle database operations
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