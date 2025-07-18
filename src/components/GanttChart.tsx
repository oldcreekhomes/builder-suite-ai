import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers } from '@syncfusion/ej2-react-gantt';
import { TreeGrid, Edit as TreeGridEdit } from '@syncfusion/ej2-treegrid';
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

// Register Syncfusion license immediately
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cXmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXhfeHVRRmhdUEZ1XEpWYEk=');

// Register TreeGrid edit module globally
TreeGrid.Inject(TreeGridEdit);

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
  const [editDialog, setEditDialog] = React.useState<{ open: boolean; taskToEdit: any | null }>({ 
    open: false, 
    taskToEdit: null 
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
        Resource: task.assigned_to ? [task.assigned_to] : [], // Keep as resource ID/name for now
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
    console.log('Toolbar clicked:', args.item.id);
    if (args.item.id === 'SyncfusionGantt_add') {
      args.cancel = true; // Cancel the default add behavior
      handleAddTask(); // Call our custom add function
    } else if (args.item.id === 'SyncfusionGantt_edit') {
      args.cancel = true; // Cancel the default edit behavior
      // Get selected task
      const ganttComponent = document.getElementById('SyncfusionGantt') as any;
      if (ganttComponent && ganttComponent.ej2_instances && ganttComponent.ej2_instances[0]) {
        const ganttInstance = ganttComponent.ej2_instances[0];
        const selectedRowIndex = ganttInstance.selectedRowIndex;
        if (selectedRowIndex >= 0 && tasks[selectedRowIndex]) {
          const selectedTask = tasks[selectedRowIndex];
          openEditDialog(selectedTask);
        } else {
          toast({
            title: "No Selection",
            description: "Please select a task to edit",
            variant: "destructive",
          });
        }
      }
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

  // Open custom edit dialog
  const openEditDialog = (task: any) => {
    // Convert Gantt task format to database format for the edit dialog
    const dbTask = {
      id: task.DatabaseID,
      task_name: task.TaskName,
      start_date: task.StartDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
      end_date: task.EndDate.toISOString().split('T')[0],
      progress: 0, // Default since not in Gantt format
      priority: 'medium', // Default
      assigned_to: task.Resource?.[0] || '',
      parent_id: task.ParentID ? tasks.find(t => t.TaskID === task.ParentID)?.DatabaseID : null,
      notes: '',
      color: '#3b82f6',
      availableParents: tasks.filter(t => t.DatabaseID !== task.DatabaseID).map(t => ({
        id: t.DatabaseID,
        task_name: t.TaskName
      })),
      availableResources: resources
    };
    
    setEditDialog({ open: true, taskToEdit: dbTask });
  };

  // Handle task updates from custom edit dialog
  const handleTaskSave = async (taskId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: updates.task_name,
          start_date: new Date(updates.start_date).toISOString(),
          end_date: new Date(updates.end_date).toISOString(),
          progress: updates.progress,
          priority: updates.priority,
          assigned_to: updates.assigned_to || null,
          parent_id: updates.parent_id || null,
          notes: updates.notes || null,
          color: updates.color || '#3b82f6'
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        toast({
          title: "Error",
          description: "Failed to update task",
          variant: "destructive",
        });
        return;
      }

      // Refresh the tasks
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Handle task delete from custom edit dialog
  const handleTaskDelete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId);

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
    }
  };


  // Handle task updates from both inline editing and other actions
  const actionComplete = (args: any) => {
    console.log('Action complete:', args.requestType, args);
    
    if (args.requestType === 'save' && args.data) {
      console.log('Save action detected, updating task in database');
      // Handle task update using the DatabaseID
      const taskData = args.data;
      if (taskData.DatabaseID) {
        updateTaskInDatabase(taskData);
      }
    } else if (args.requestType === 'indent' || args.requestType === 'outdent') {
      console.log('Hierarchy change detected');
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

  // Handle action begin - only block toolbar edit button, allow everything else
  const actionBegin = (args: any) => {
    console.log('Action begin:', args.requestType, args);
    
    // Only cancel edit dialog if it was explicitly triggered by the toolbar Edit button
    // We can detect this by checking if a task is already selected when beforeOpenEditDialog fires
    if (args.requestType === 'beforeOpenEditDialog') {
      console.log('Edit dialog triggered, checking if from toolbar...');
      // For now, let all edit dialogs through to enable inline editing
      // The toolbar edit is handled separately in toolbarClick
    }
  };


  const updateTaskInDatabase = async (taskData: any) => {
    try {
      // Handle resource assignment - the Resource field contains the selected resourceId
      let assignedTo = null;
      if (taskData.Resource && taskData.Resource.length > 0) {
        // The Resource array now contains the resourceId directly
        const resourceId = taskData.Resource[0];
        // Find the resource to get the name for storage
        const resource = resources.find(r => r.resourceId === resourceId);
        assignedTo = resource ? resource.resourceName : resourceId; // Store name or fallback to ID
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
    { field: 'TaskID', headerText: 'ID', width: 80, allowEditing: false, isPrimaryKey: true },
    { field: 'TaskName', headerText: 'Task Name', width: 250, allowEditing: true },
    { field: 'StartDate', headerText: 'Start Date', allowEditing: true },
    { field: 'Duration', headerText: 'Duration', allowEditing: true },
    { field: 'EndDate', headerText: 'End Date', allowEditing: true },
    { 
      field: 'Resource', 
      headerText: 'Resource', 
      width: 200,
      allowEditing: true,
      editType: 'dropdownedit',
      edit: {
        params: {
          dataSource: resources,
          fields: { value: 'resourceId', text: 'resourceName' },
          allowFiltering: true,
          filterBarPlaceholder: 'Search resources...'
        }
      }
    },
    { 
      field: 'Predecessor', 
      headerText: 'Dependencies', 
      width: 150,
      allowEditing: true
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
    showDeleteConfirmDialog: false,
    newRowPosition: 'Bottom' as any,
    mode: 'Cell' as any
  };

  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'Indent', 'Outdent', 'ExpandAll', 'CollapseAll'];

  if (isLoading) {
    return <div style={{ padding: '10px' }}>Loading schedule...</div>;
  }

  console.log('Rendering GanttChart with tasks:', tasks.length);
  console.log('Resources available:', resources.length);

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
        actionBegin={actionBegin}
      >
        <Inject services={[Selection, Toolbar, Edit, TreeGridEdit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers]} />
      </GanttComponent>

      <TaskEditDialog
        task={editDialog.taskToEdit}
        isOpen={editDialog.open}
        onClose={() => setEditDialog({ open: false, taskToEdit: null })}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
      />

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
