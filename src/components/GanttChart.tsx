
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TaskEditDialog } from "@/components/schedule/TaskEditDialog";
import { Trash2 } from "lucide-react";

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

  // Fetch resources first - this must complete before tasks
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['available-resources'],
    queryFn: async () => {
      console.log('Fetching resources...');
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

      console.log('Resources loaded:', allResources.length, allResources);
      return allResources;
    },
  });

  // Fetch schedule tasks - now depends on resources being loaded
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['project-schedule-tasks', projectId],
    queryFn: async () => {
      console.log('Fetching tasks for project:', projectId);
      console.log('Resources available for task transformation:', resources.length);
      
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

      // Create mapping between UUIDs and simple numbers for tasks
      const taskIdToNumber = new Map();
      const numberToTaskId = new Map();
      
      data.forEach((task, index) => {
        const simpleId = index + 1;
        taskIdToNumber.set(task.id, simpleId);
        numberToTaskId.set(simpleId, task.id);
      });

      // Update the mapping state for use in save operations
      setTaskIdMapping(numberToTaskId);

      // Transform data to use simple numbers and names for display
      const transformedTasks = data.map((task, index) => {
        const simpleId = index + 1;
        let simplePredecessor = '';
        
        if (task.predecessor) {
          const predecessorNumber = taskIdToNumber.get(task.predecessor);
          simplePredecessor = predecessorNumber ? predecessorNumber.toString() : '';
        }

        // Convert UUIDs to names for display - handle multiple resources
        let resourceName = '';
        if (task.assigned_to) {
          console.log('Looking for resource with UUID:', task.assigned_to);
          
          // Handle multiple UUIDs (comma-separated)
          const resourceUUIDs = task.assigned_to.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
          const resourceNames = [];
          
          for (const uuid of resourceUUIDs) {
            const foundResource = resources.find(r => r.resourceId === uuid);
            if (foundResource) {
              resourceNames.push(foundResource.resourceName);
              console.log('Found resource name:', foundResource.resourceName, 'for UUID:', uuid);
            } else {
              console.warn('Could not find resource name for UUID:', uuid);
              console.log('Available resources:', resources.map(r => ({ id: r.resourceId, name: r.resourceName })));
            }
          }
          
          resourceName = resourceNames.join(', ');
        }

        return {
          taskID: simpleId, // Use simple number for display
          taskName: task.task_name,
          startDate: new Date(task.start_date),
          endDate: new Date(task.end_date),
          duration: task.duration,
          progress: task.progress || 0,
          resourceInfo: resourceName, // Use name for display
          dependency: simplePredecessor,
          parentID: task.parent_id,
        };
      });

      console.log('Transformed tasks for Gantt:', transformedTasks);
      return transformedTasks;
    },
    enabled: !!projectId && !resourcesLoading && resources.length >= 0, // Wait for resources to load
  });

  const isLoading = resourcesLoading || tasksLoading;

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

  // Remove resource from task
  const removeResourceFromTask = async (taskSimpleId: number, resourceNameToRemove: string) => {
    try {
      const actualTaskUUID = taskIdMapping.get(taskSimpleId);
      if (!actualTaskUUID) {
        console.error('Could not find UUID for task ID:', taskSimpleId);
        return;
      }

      // Get current task data
      const { data: currentTask, error: fetchError } = await supabase
        .from('project_schedule_tasks')
        .select('assigned_to')
        .eq('id', actualTaskUUID)
        .single();

      if (fetchError) {
        console.error('Error fetching current task:', fetchError);
        return;
      }

      if (!currentTask?.assigned_to) {
        return; // No resources to remove
      }

      // Convert resource name to UUID for removal
      const resourceToRemove = resources.find(r => r.resourceName === resourceNameToRemove);
      if (!resourceToRemove) {
        console.error('Could not find resource UUID for name:', resourceNameToRemove);
        return;
      }

      // Remove the UUID from the comma-separated list
      const currentUUIDs = currentTask.assigned_to.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
      const updatedUUIDs = currentUUIDs.filter(uuid => uuid !== resourceToRemove.resourceId);
      
      const newAssignedTo = updatedUUIDs.length > 0 ? updatedUUIDs.join(',') : null;

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({ assigned_to: newAssignedTo })
        .eq('id', actualTaskUUID);

      if (error) {
        console.error('Error removing resource:', error);
        toast({
          title: "Error",
          description: "Failed to remove resource",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Resource removed successfully",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Error removing resource:', error);
      toast({
        title: "Error",
        description: "Failed to remove resource",
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

  // Handle action completion - separate resource updates from other updates
  const actionComplete = (args: any) => {
    if (args.requestType === 'save' && args.data) {
      console.log('Action complete with data:', args.data);
      
      // Check if this is a resource update by comparing with original data
      const originalTask = tasks.find(t => t.taskID === args.data.taskID);
      if (originalTask && originalTask.resourceInfo !== args.data.resourceInfo) {
        console.log('Resource update detected');
        updateTaskResources(args.data);
      } else {
        console.log('Non-resource update detected');
        updateNonResourceTaskFields(args.data);
      }
    }
  };

  const updateTaskResources = async (taskData: any) => {
    try {
      console.log('Updating task resources:', taskData);
      
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

      // Convert resource names back to UUIDs for database storage
      let assignedToUUIDs = null;
      if (taskData.resourceInfo) {
        const resourceNames = taskData.resourceInfo.split(',').map((name: string) => name.trim()).filter((name: string) => name);
        const resourceUUIDs = [];
        
        for (const resourceName of resourceNames) {
          const foundResource = resources.find(r => r.resourceName === resourceName);
          if (foundResource) {
            resourceUUIDs.push(foundResource.resourceId);
          } else {
            console.warn('Could not find UUID for resource name:', resourceName);
          }
        }
        
        assignedToUUIDs = resourceUUIDs.length > 0 ? resourceUUIDs.join(',') : null;
      }

      console.log('Updating task resources with UUIDs:', assignedToUUIDs);

      // Only update the assigned_to field
      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          assigned_to: assignedToUUIDs,
        })
        .eq('id', actualTaskUUID);

      if (error) {
        console.error('Error updating task resources:', error);
        toast({
          title: "Error",
          description: "Failed to update task resources",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Task resources updated successfully",
      });
      
      // Refresh data to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Error updating task resources:', error);
      toast({
        title: "Error",
        description: "Failed to update task resources",
        variant: "destructive",
      });
    }
  };

  const updateNonResourceTaskFields = async (taskData: any) => {
    try {
      console.log('Updating non-resource task fields:', taskData);
      
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
        const dependencyStr = taskData.dependency.toString();
        const predecessorNumber = parseInt(dependencyStr.replace(/[A-Z]/g, ''));
        
        if (!isNaN(predecessorNumber) && predecessorNumber > 0) {
          predecessorUUID = taskIdMapping.get(predecessorNumber);
        }
      }

      console.log('Updating task:', actualTaskUUID, 'with predecessor:', predecessorUUID);

      // Only update non-resource fields
      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: taskData.taskName,
          start_date: new Date(taskData.startDate).toISOString(),
          end_date: new Date(taskData.endDate).toISOString(),
          duration: taskData.duration,
          progress: taskData.progress || 0,
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

  // Custom column template for resources with delete buttons
  const resourceTemplate = (props: any) => {
    if (!props.resourceInfo) return <div>No resources</div>;
    
    const resourceNames = props.resourceInfo.split(',').map((name: string) => name.trim()).filter((name: string) => name);
    
    return (
      <div className="flex flex-wrap gap-1">
        {resourceNames.map((resourceName: string, index: number) => (
          <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
            <span>{resourceName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeResourceFromTask(props.taskID, resourceName);
              }}
              className="text-red-500 hover:text-red-700 ml-1"
              title="Remove resource"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    );
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
    resourceField: 'resourceInfo',
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
    { field: 'resourceInfo', headerText: 'Resource', width: 300 },
    { field: 'dependency', headerText: 'Predecessor', width: 150 },
  ];

  const splitterSettings = {
    position: "35%"
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

  console.log('Final render - Resources available:', resources.length);
  console.log('Final render - Tasks available:', tasks.length);

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
