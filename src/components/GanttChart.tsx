
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

// Register Syncfusion license immediately
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cXmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXhfeHVRRmhdUEZ1XEpWYEk=');

interface GanttChartProps {
  projectId: string;
}

function GanttChart({ projectId }: GanttChartProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; taskToDelete: any | null }>({ 
    open: false, 
    taskToDelete: null 
  });
  
  // Fetch schedule tasks from the database
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-schedule-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) {
        console.error('Error fetching schedule tasks:', error);
        throw error;
      }

      // Transform database data to Gantt format with numerical IDs
      return data.map((task, index) => ({
        TaskID: index + 1, // Show simple numerical ID on frontend
        DatabaseID: task.id, // Keep the actual UUID for database operations
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Resource: task.assigned_to ? [task.assigned_to] : [], // Convert to array for resource mapping
        Predecessor: task.dependencies?.join(',') || null,
        ParentID: task.parent_id ? data.findIndex(t => t.id === task.parent_id) + 1 : null, // Map parent UUID to TaskID
      }));
    },
    enabled: !!projectId,
  });

  // Fetch available resources (company users and representatives)
  const { data: resources = [] } = useQuery({
    queryKey: ['available-resources'],
    queryFn: async () => {
      console.log('Fetching resources...');
      
      // Fetch company users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch company representatives
      const { data: representatives, error: repsError } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, email');

      if (repsError) {
        console.error('Error fetching representatives:', repsError);
      }

      console.log('Raw users data:', users);
      console.log('Raw representatives data:', representatives);

      // Combine and format resources, avoiding duplicates by email
      const allResources = [];
      const seenEmails = new Set();
      
      if (users && users.length > 0) {
        users.forEach(user => {
          if (!seenEmails.has(user.email)) {
            const resourceName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
            console.log('Adding user resource:', resourceName);
            allResources.push({
              resourceId: user.id,
              resourceName: resourceName,
              resourceType: 'user'
            });
            seenEmails.add(user.email);
          }
        });
      }

      if (representatives && representatives.length > 0) {
        representatives.forEach(rep => {
          if (!seenEmails.has(rep.email)) {
            const resourceName = `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || rep.email;
            console.log('Adding rep resource:', resourceName);
            allResources.push({
              resourceId: rep.id,
              resourceName: resourceName,
              resourceType: 'representative'
            });
            seenEmails.add(rep.email);
          }
        });
      }

      console.log('Final allResources:', allResources);
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

      // Refresh the tasks
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
      args.cancel = true; // Cancel the default add behavior
      handleAddTask(); // Call our custom add function
    } else if (args.item.id === 'SyncfusionGantt_delete') {
      args.cancel = true; // Cancel the default delete behavior
      // Get selected task using the correct method
      const ganttComponent = document.getElementById('SyncfusionGantt') as any;
      if (ganttComponent && ganttComponent.ej2_instances && ganttComponent.ej2_instances[0]) {
        const ganttInstance = ganttComponent.ej2_instances[0];
        const selectedRowIndex = ganttInstance.selectedRowIndex;
        if (selectedRowIndex >= 0 && tasks[selectedRowIndex]) {
          setDeleteDialog({ open: true, taskToDelete: tasks[selectedRowIndex] });
        } else {
          toast({
            title: "No Selection",
            description: "Please select a task to delete",
            variant: "destructive",
          });
        }
      }
    }
  };

  // Handle task updates
  const actionComplete = (args: any) => {
    if (args.requestType === 'save' && args.data) {
      // Handle task update using the DatabaseID
      const taskData = args.data;
      if (taskData.DatabaseID) {
        updateTaskInDatabase(taskData);
      }
    } else if (args.requestType === 'indent' || args.requestType === 'outdent') {
      // Handle indent/outdent operations
      if (args.data && args.data.length > 0) {
        args.data.forEach((taskData: any) => {
          if (taskData.DatabaseID) {
            updateTaskHierarchy(taskData);
          }
        });
      }
    }
  };

  const updateTaskInDatabase = async (taskData: any) => {
    try {
      // Extract resource ID from the resource array
      let assignedTo = null;
      if (taskData.Resource && taskData.Resource.length > 0) {
        // Find the resource ID from the resources array
        const resourceId = taskData.Resource[0];
        const resource = resources.find(r => r.resourceId === resourceId);
        assignedTo = resource ? resource.resourceId : null;
      }

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: taskData.TaskName,
          start_date: new Date(taskData.StartDate).toISOString(),
          end_date: new Date(taskData.EndDate).toISOString(),
          duration: taskData.Duration,
          assigned_to: assignedTo,
        })
        .eq('id', taskData.DatabaseID);

      if (error) {
        console.error('Error updating task:', error);
        toast({
          title: "Error",
          description: "Failed to update task",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const updateTaskHierarchy = async (taskData: any) => {
    try {
      // Extract parent_id from the task data - Syncfusion sets parentItem for child tasks
      const parentId = taskData.parentItem ? taskData.parentItem.DatabaseID : null;

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          parent_id: parentId,
        })
        .eq('id', taskData.DatabaseID);

      if (error) {
        console.error('Error updating task hierarchy:', error);
        toast({
          title: "Error",
          description: "Failed to update task hierarchy",
          variant: "destructive",
        });
      } else {
        // Refresh the tasks to reflect hierarchy changes
        queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      }
    } catch (error) {
      console.error('Error updating task hierarchy:', error);
    }
  };

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    resourceInfo: 'Resource',
    dependency: 'Predecessor',
    parentID: 'ParentID',
  };

  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName'
  };

  const labelSettings: any = {
    leftLabel: 'TaskName'
  };

  const columns: any[] = [
    { field: 'TaskID', headerText: 'ID', width: 80, allowEditing: false },
    { field: 'TaskName', headerText: 'Task Name', width: 250 },
    { field: 'StartDate', headerText: 'Start Date' },
    { field: 'Duration', headerText: 'Duration' },
    { field: 'EndDate', headerText: 'End Date' },
    { 
      field: 'Resource', 
      headerText: 'Resource', 
      width: 200
      // Removed the editType and edit params - let Syncfusion handle resource management
    },
    { 
      field: 'Predecessor', 
      headerText: 'Dependencies', 
      width: 150 
    },
  ];

  const splitterSettings = {
    position: "28%"
  };

  // Set dynamic project dates based on tasks or default dates
  const projectStartDate: Date = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.StartDate).getTime())))
    : new Date();
  
  const projectEndDate: Date = tasks.length > 0 
    ? new Date(Math.max(...tasks.map(t => new Date(t.EndDate).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: false, // Disable default confirm dialog to use our custom one
    newRowPosition: 'Bottom' as any
  };

  // Handle custom delete operation
  const handleDeleteTask = async () => {
    if (!deleteDialog.taskToDelete) return;

    try {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', deleteDialog.taskToDelete.DatabaseID);

      if (error) {
        console.error('Error deleting task:', error);
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive",
        });
        return;
      }

      // Refresh the tasks
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ open: false, taskToDelete: null });
    }
  };

  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'Indent', 'Outdent', 'ExpandAll', 'CollapseAll'];

  if (isLoading) {
    return <div style={{ padding: '10px' }}>Loading schedule...</div>;
  }

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
        toolbarClick={toolbarClick}
        actionComplete={actionComplete}
      >
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu]} />
      </GanttComponent>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, taskToDelete: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.taskToDelete?.TaskName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GanttChart;
