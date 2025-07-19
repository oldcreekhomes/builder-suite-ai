
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TaskEditDialog } from "@/components/schedule/TaskEditDialog";

// Import Syncfusion CSS
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-calendars/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import '@syncfusion/ej2-layouts/styles/material.css';
import '@syncfusion/ej2-grids/styles/material.css';
import '@syncfusion/ej2-treegrid/styles/material.css';
import '@syncfusion/ej2-gantt/styles/material.css';

// Register Syncfusion license
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cWmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXhfeHVRRmhdUEZ1XEpWYEk=');

interface GanttChartProps {
  projectId: string;
}

// Helper function to transform database data to Syncfusion format
const transformToSyncfusion = (dbTasks: any[], resources: any[]) => {
  console.log('Transforming to Syncfusion format - DB tasks:', dbTasks.length, 'Resources:', resources.length);
  
  // Create simple ID mapping for tasks
  const taskIdMapping = new Map();
  dbTasks.forEach((task, index) => {
    const simpleId = index + 1;
    taskIdMapping.set(task.id, simpleId);
  });

  const transformedTasks = dbTasks.map((task, index) => {
    const simpleId = index + 1;
    
    // Convert predecessor UUID to simple number
    let simplePredecessor = '';
    if (task.predecessor) {
      const predecessorNumber = taskIdMapping.get(task.predecessor);
      if (predecessorNumber) {
        simplePredecessor = predecessorNumber.toString();
      }
    }

    // Convert resource UUIDs to names for display
    let resourceNames = '';
    if (task.assigned_to) {
      const resourceUUIDs = task.assigned_to.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
      const names = resourceUUIDs
        .map(uuid => resources.find(r => r.resourceId === uuid)?.resourceName)
        .filter(name => name);
      resourceNames = names.join(', ');
    }

    console.log(`Task ${task.task_name}: UUIDs [${task.assigned_to}] -> Names [${resourceNames}]`);

    return {
      taskID: simpleId,
      taskName: task.task_name,
      startDate: new Date(task.start_date),
      endDate: new Date(task.end_date),
      duration: task.duration,
      progress: task.progress || 0,
      resourceInfo: resourceNames,
      dependency: simplePredecessor,
      parentID: task.parent_id,
    };
  });

  return { transformedTasks, taskIdMapping };
};

// Helper function to transform Syncfusion data back to database format
const transformFromSyncfusion = (taskData: any, taskIdMapping: Map<number, string>, resources: any[]) => {
  console.log('Transforming from Syncfusion - Task:', taskData.taskName, 'Resources:', taskData.resourceInfo);
  
  // Get actual task UUID
  const actualTaskUUID = taskIdMapping.get(taskData.taskID);
  if (!actualTaskUUID) {
    throw new Error(`Could not find UUID for task ID: ${taskData.taskID}`);
  }

  // Convert simple predecessor number back to UUID
  let predecessorUUID = null;
  if (taskData.dependency) {
    const dependencyStr = taskData.dependency.toString();
    const predecessorNumber = parseInt(dependencyStr.replace(/[A-Z]/g, ''));
    if (!isNaN(predecessorNumber) && predecessorNumber > 0) {
      predecessorUUID = taskIdMapping.get(predecessorNumber);
    }
  }

  // Convert resource names back to UUIDs
  let resourceUUIDs = null;
  if (taskData.resourceInfo && taskData.resourceInfo.trim() !== '') {
    const resourceNames = taskData.resourceInfo.split(',').map(name => name.trim()).filter(name => name);
    const foundUUIDs = resourceNames
      .map(name => resources.find(r => r.resourceName === name)?.resourceId)
      .filter(uuid => uuid);
    
    resourceUUIDs = foundUUIDs.length > 0 ? foundUUIDs.join(',') : null;
    console.log(`Resource transformation: Names [${resourceNames.join(', ')}] -> UUIDs [${resourceUUIDs}]`);
  }

  return {
    id: actualTaskUUID,
    task_name: taskData.taskName,
    start_date: new Date(taskData.startDate).toISOString(),
    end_date: new Date(taskData.endDate).toISOString(),
    duration: taskData.duration,
    progress: taskData.progress || 0,
    assigned_to: resourceUUIDs,
    predecessor: predecessorUUID,
    parent_id: taskData.parentID || null,
  };
};

// Helper function to validate task data
const validateTaskData = (taskData: any) => {
  if (!taskData.taskName || taskData.taskName.trim() === '') {
    throw new Error('Task name is required');
  }
  if (!taskData.startDate || !taskData.endDate) {
    throw new Error('Start date and end date are required');
  }
  if (new Date(taskData.endDate) < new Date(taskData.startDate)) {
    throw new Error('End date must be after start date');
  }
  return true;
};

function GanttChart({ projectId }: GanttChartProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ganttRef = React.useRef<any>(null);
  const [taskIdMapping, setTaskIdMapping] = React.useState<Map<number, string>>(new Map());
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; taskToDelete: any | null }>({ 
    open: false, 
    taskToDelete: null 
  });
  const [editDialog, setEditDialog] = React.useState<{ open: boolean; taskToEdit: any | null }>({ 
    open: false, 
    taskToEdit: null 
  });

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['available-resources'],
    queryFn: async () => {
      console.log('Fetching resources...');
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email');

      const { data: representatives } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, email');

      const allResources = [];
      
      if (users) {
        users.forEach(user => {
          const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
          allResources.push({
            resourceId: user.id,
            resourceName: name,
          });
        });
      }

      if (representatives) {
        representatives.forEach(rep => {
          const name = `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || rep.email;
          allResources.push({
            resourceId: rep.id,
            resourceName: name,
          });
        });
      }

      console.log('Resources loaded:', allResources.length);
      return allResources;
    },
  });

  // Fetch schedule tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['project-schedule-tasks', projectId],
    queryFn: async () => {
      console.log('Fetching tasks for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) {
        console.error('Error fetching schedule tasks:', error);
        throw error;
      }

      console.log('Raw tasks from database:', data.length);
      
      // Transform data using helper function
      const { transformedTasks, taskIdMapping: mapping } = transformToSyncfusion(data, resources);
      setTaskIdMapping(mapping);
      
      return transformedTasks;
    },
    enabled: !!projectId && !resourcesLoading && resources.length >= 0,
  });

  const isLoading = resourcesLoading || tasksLoading;

  // Handle adding new task
  const handleAddTask = async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          project_id: projectId,
          task_name: 'New Task',
          start_date: today.toISOString(),
          end_date: tomorrow.toISOString(),
          duration: 1,
          order_index: tasks.length,
          color: '#3b82f6'
        });

      if (error) {
        console.error('Error adding task:', error);
        toast({
          title: "Error",
          description: "Failed to add new task",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
      toast({
        title: "Success",
        description: "New task added successfully",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add new task",
        variant: "destructive",
      });
    }
  };

  // Handle toolbar click events
  const toolbarClick = (args: any) => {
    if (args.item.id === 'SyncfusionGantt_add') {
      args.cancel = true;
      handleAddTask();
    }
  };

  // Single clean action handler
  const actionComplete = (args: any) => {
    if (args.requestType === 'save' && args.data) {
      console.log('Syncfusion save event triggered:', args.data);
      handleTaskSave(args.data);
    }
  };

  // Clean task save handler
  const handleTaskSave = async (taskData: any) => {
    try {
      // Validate data first
      validateTaskData(taskData);
      
      // Transform data using helper function
      const dbTaskData = transformFromSyncfusion(taskData, taskIdMapping, resources);
      
      console.log('Saving to database:', dbTaskData);

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: dbTaskData.task_name,
          start_date: dbTaskData.start_date,
          end_date: dbTaskData.end_date,
          duration: dbTaskData.duration,
          progress: dbTaskData.progress,
          assigned_to: dbTaskData.assigned_to,
          predecessor: dbTaskData.predecessor,
          parent_id: dbTaskData.parent_id,
        })
        .eq('id', dbTaskData.id);

      if (error) {
        console.error('Database save error:', error);
        toast({
          title: "Error",
          description: "Failed to update task",
          variant: "destructive",
        });
        return;
      }

      console.log('Task saved successfully, refreshing data...');
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      
      // Refresh data - this will properly display all resources
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Task save error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Syncfusion configuration
  const taskFields = {
    id: 'taskID',
    name: 'taskName',
    startDate: 'startDate',
    endDate: 'endDate',
    duration: 'duration',
    progress: 'progress',
    resourceInfo: 'resourceInfo',
    dependency: 'dependency',
    parentID: 'parentID',
  };

  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName'
  };

  const labelSettings = {
    leftLabel: 'taskName'
  };

  const columns = [
    { field: 'taskID', headerText: 'ID', width: 80 },
    { field: 'taskName', headerText: 'Task Name', width: 250 },
    { field: 'startDate', headerText: 'Start Date', width: 120 },
    { field: 'duration', headerText: 'Duration', width: 100 },
    { field: 'endDate', headerText: 'End Date', width: 120 },
    { 
      field: 'resourceInfo', 
      headerText: 'Resource', 
      width: 200,
      editType: 'dropdownedit'
    },
    { field: 'dependency', headerText: 'Predecessor', width: 150 },
  ];

  const splitterSettings = {
    position: "28%"
  };

  const projectStartDate = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())))
    : new Date();
  
  const projectEndDate = tasks.length > 0 
    ? new Date(Math.max(...tasks.map(t => new Date(t.endDate).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true
  };

  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'Indent', 'Outdent', 'ExpandAll', 'CollapseAll'];

  if (isLoading) {
    return <div style={{ padding: '10px' }}>Loading schedule...</div>;
  }

  console.log('Rendering Gantt - Resources:', resources.length, 'Tasks:', tasks.length);

  return (
    <div style={{ padding: '10px' }}>
      <GanttComponent 
        ref={ganttRef}
        id='SyncfusionGantt' 
        dataSource={tasks}
        taskFields={taskFields} 
        resourceFields={resourceFields}
        resources={resources}
        labelSettings={labelSettings} 
        columns={columns}
        height='500px'
        projectStartDate={projectStartDate} 
        projectEndDate={projectEndDate}
        editSettings={editSettings}
        toolbar={toolbar}
        splitterSettings={splitterSettings}
        allowSorting={true}
        allowReordering={true}
        allowSelection={true}
        allowResizing={true}
        allowFiltering={true}
        gridLines="Both"
        toolbarClick={toolbarClick}
        actionComplete={actionComplete}
      >
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath]} />
      </GanttComponent>

      <TaskEditDialog
        task={editDialog.taskToEdit}
        isOpen={editDialog.open}
        onClose={() => setEditDialog({ open: false, taskToEdit: null })}
        onSave={() => {}}
        onDelete={() => {}}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, taskToDelete: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GanttChart;
