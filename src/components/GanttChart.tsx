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

function GanttChart({ projectId }: GanttChartProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [taskIdMapping, setTaskIdMapping] = React.useState<Map<number, string>>(new Map());
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; taskToDelete: any | null }>({ 
    open: false, 
    taskToDelete: null 
  });
  const [editDialog, setEditDialog] = React.useState<{ open: boolean; taskToEdit: any | null }>({ 
    open: false, 
    taskToEdit: null 
  });

  // Fetch schedule tasks from the database
  const { data: tasks = [], isLoading } = useQuery({
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

      console.log('Raw data from database:', data);
      console.log('Number of tasks found:', data.length);

      // Create mapping between UUIDs and simple numbers
      const taskIdToNumber = new Map();
      const numberToTaskId = new Map();
      
      data.forEach((task, index) => {
        const simpleId = index + 1;
        taskIdToNumber.set(task.id, simpleId);
        numberToTaskId.set(simpleId, task.id);
      });

      // Update the mapping state for use in save operations
      setTaskIdMapping(numberToTaskId);

      // Transform data to use simple numbers for display
      const transformedTasks = data.map((task, index) => {
        const simpleId = index + 1;
        let simplePredecessor = '';
        
        if (task.predecessor) {
          const predecessorNumber = taskIdToNumber.get(task.predecessor);
          simplePredecessor = predecessorNumber ? predecessorNumber.toString() : '';
        }

        // Keep the UUID for resourceInfo, Syncfusion needs it to match with resources
        return {
          taskID: simpleId, // Use simple number for display
          taskName: task.task_name,
          startDate: new Date(task.start_date),
          endDate: new Date(task.end_date),
          duration: task.duration,
          progress: task.progress || 0,
          resourceInfo: task.assigned_to ? [task.assigned_to] : [],
          dependency: simplePredecessor,
          parentID: task.parent_id,
        };
      });

      console.log('Transformed tasks for Gantt:', transformedTasks);
      return transformedTasks;
    },
    enabled: !!projectId,
  });

  // Simplified resource fetching - just get users and representatives
  const { data: resources = [] } = useQuery({
    queryKey: ['available-resources'],
    queryFn: async () => {
      // Fetch company users
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email');

      // Fetch company representatives  
      const { data: representatives } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, email');

      // Combine all resources
      const allResources = [];
      
      // Add users
      if (users) {
        users.forEach(user => {
          const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
          allResources.push({
            resourceId: user.id,
            resourceName: name,
          });
        });
      }

      // Add representatives
      if (representatives) {
        representatives.forEach(rep => {
          const name = `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || rep.email;
          allResources.push({
            resourceId: rep.id,
            resourceName: name,
          });
        });
      }

      console.log('Simple fetch - Total resources:', allResources.length);
      return allResources;
    },
  });

  // Handle adding new task
  const handleAddTask = async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          project_id: projectId,
          task_name: 'New Task',
          start_date: today.toISOString(),
          end_date: tomorrow.toISOString(),
          duration: 1,
          order_index: tasks.length,
          color: '#3b82f6'
        })
        .select()
        .single();

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

  // Handle action completion - simplified to use Syncfusion's built-in events
  const actionComplete = (args: any) => {
    if (args.requestType === 'save' && args.data) {
      updateTaskInDatabase(args.data);
    }
  };

  const updateTaskInDatabase = async (taskData: any) => {
    try {
      console.log('Saving task data:', taskData);
      
      // Get the actual UUID from our mapping
      const actualTaskUUID = taskIdMapping.get(taskData.taskID);
      if (!actualTaskUUID) {
        console.error('Could not find UUID for task ID:', taskData.taskID);
        toast({
          title: "Error",
          description: "Could not identify task for update",
          variant: "destructive",
        });
        return;
      }

      // Convert simple predecessor number back to UUID
      let predecessorUUID = null;
      if (taskData.dependency) {
        // Handle Syncfusion's dependency format like "1FS", "2FS", etc.
        const dependencyStr = taskData.dependency.toString();
        const predecessorNumber = parseInt(dependencyStr.replace(/[A-Z]/g, '')); // Remove FS, SS, etc.
        
        if (!isNaN(predecessorNumber) && predecessorNumber > 0) {
          predecessorUUID = taskIdMapping.get(predecessorNumber);
        }
      }

      console.log('Updating task:', actualTaskUUID, 'with predecessor:', predecessorUUID);

      // Make sure we save the resource UUID, not the display value
      const resourceUUID = taskData.resourceInfo?.[0] || null;
      
      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: taskData.taskName,
          start_date: new Date(taskData.startDate).toISOString(),
          end_date: new Date(taskData.endDate).toISOString(),
          duration: taskData.duration,
          progress: taskData.progress || 0,
          assigned_to: resourceUUID,
          predecessor: predecessorUUID,
          parent_id: taskData.parentID || null,
        })
        .eq('id', actualTaskUUID);

      if (error) {
        console.error('Error updating task:', error);
        toast({
          title: "Error",
          description: "Failed to update task",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      
      // Refresh data to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Standard Syncfusion field mapping
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
      editType: 'dropdownedit',
      template: (props: any) => {
        if (props.resourceInfo && props.resourceInfo.length > 0) {
          const resourceId = props.resourceInfo[0];
          const resource = resources.find(r => r.resourceId === resourceId);
          return resource ? resource.resourceName : '';
        }
        return '';
      }
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

  console.log('Resources available:', resources.length);
  console.log('Resources data:', resources);

  return (
    <div style={{ padding: '10px' }}>
      <GanttComponent 
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
