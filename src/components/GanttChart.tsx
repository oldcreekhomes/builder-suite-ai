
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers } from '@syncfusion/ej2-react-gantt';
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

      // Simple transformation to match Syncfusion's expected format
      return data.map((task) => ({
        taskID: task.id, // Use actual UUID as ID
        taskName: task.task_name,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        duration: task.duration,
        progress: task.progress || 0,
        resourceInfo: task.assigned_to ? [task.assigned_to] : [],
        dependency: task.predecessor || '',
        parentID: task.parent_id,
      }));
    },
    enabled: !!projectId,
  });

  // Fetch available resources
  const { data: resources = [] } = useQuery({
    queryKey: ['available-resources'],
    queryFn: async () => {
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

      // Combine and format resources
      const allResources = [];
      const seenEmails = new Set();
      
      if (users && users.length > 0) {
        users.forEach(user => {
          if (!seenEmails.has(user.email)) {
            const resourceName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
            allResources.push({
              resourceId: user.id,
              resourceName: resourceName,
            });
            seenEmails.add(user.email);
          }
        });
      }

      if (representatives && representatives.length > 0) {
        representatives.forEach(rep => {
          if (!seenEmails.has(rep.email)) {
            const resourceName = `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || rep.email;
            allResources.push({
              resourceId: rep.id,
              resourceName: resourceName,
            });
            seenEmails.add(rep.email);
          }
        });
      }

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
      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: taskData.taskName,
          start_date: new Date(taskData.startDate).toISOString(),
          end_date: new Date(taskData.endDate).toISOString(),
          duration: taskData.duration,
          progress: taskData.progress || 0,
          assigned_to: taskData.resourceInfo?.[0] || null,
          predecessor: taskData.dependency || null,
          parent_id: taskData.parentID || null,
        })
        .eq('id', taskData.taskID);

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
      edit: {
        params: {
          dataSource: resources,
          fields: { value: 'resourceId', text: 'resourceName' },
          allowFiltering: true,
        }
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
    showDeleteConfirmDialog: true,
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
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers]} />
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
