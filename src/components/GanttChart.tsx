
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const ganttRef = React.useRef<any>(null);

  // Fetch resources first
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

  // Fetch schedule tasks - simplified to use UUIDs directly
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

      console.log('Raw data from database:', data);

      // Simple transformation - use UUIDs directly
      const transformedTasks = data.map((task) => {
        // Convert assigned_to UUIDs to resource names for display
        let resourceInfo = [];
        if (task.assigned_to) {
          const resourceUUIDs = task.assigned_to.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
          
          for (const uuid of resourceUUIDs) {
            const foundResource = resources.find(r => r.resourceId === uuid);
            if (foundResource) {
              resourceInfo.push({
                resourceId: foundResource.resourceId,
                resourceName: foundResource.resourceName
              });
            }
          }
        }

        return {
          taskID: task.id, // Use actual UUID
          taskName: task.task_name,
          startDate: new Date(task.start_date),
          endDate: new Date(task.end_date),
          duration: task.duration,
          progress: task.progress || 0,
          resourceInfo: resourceInfo, // Use resource objects
          dependency: task.predecessor || '', // Use as-is
          parentID: task.parent_id,
        };
      });

      console.log('Transformed tasks for Gantt:', transformedTasks);
      return transformedTasks;
    },
    enabled: !!projectId && !resourcesLoading,
  });

  const isLoading = resourcesLoading || tasksLoading;

  // Simplified action handler - let Syncfusion handle most operations
  const actionComplete = async (args: any) => {
    console.log('Action complete:', args.requestType, args.data);
    
    if (args.requestType === 'save' && args.data) {
      await saveTaskToDatabase(args.data);
    } else if (args.requestType === 'add' && args.data) {
      await saveNewTaskToDatabase(args.data);
    } else if (args.requestType === 'delete' && args.data) {
      await deleteTaskFromDatabase(args.data);
    }
  };

  const saveTaskToDatabase = async (taskData: any) => {
    try {
      console.log('Saving existing task:', taskData);
      
      // Convert resource info back to UUIDs
      let resourceUUIDs = null;
      if (taskData.resourceInfo && taskData.resourceInfo.length > 0) {
        const uuids = taskData.resourceInfo.map(resource => resource.resourceId);
        resourceUUIDs = uuids.join(',');
      }

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update({
          task_name: taskData.taskName,
          start_date: new Date(taskData.startDate).toISOString(),
          end_date: new Date(taskData.endDate).toISOString(),
          duration: taskData.duration,
          progress: taskData.progress || 0,
          assigned_to: resourceUUIDs,
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
      
      // Refresh data
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

  const saveNewTaskToDatabase = async (taskData: any) => {
    try {
      console.log('Saving new task:', taskData);
      
      // Convert resource info to UUIDs
      let resourceUUIDs = null;
      if (taskData.resourceInfo && taskData.resourceInfo.length > 0) {
        const uuids = taskData.resourceInfo.map(resource => resource.resourceId);
        resourceUUIDs = uuids.join(',');
      }

      const { error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          id: taskData.taskID, // Use the UUID generated by Syncfusion
          project_id: projectId,
          task_name: taskData.taskName || 'New Task',
          start_date: new Date(taskData.startDate).toISOString(),
          end_date: new Date(taskData.endDate).toISOString(),
          duration: taskData.duration || 1,
          progress: taskData.progress || 0,
          assigned_to: resourceUUIDs,
          predecessor: taskData.dependency || null,
          parent_id: taskData.parentID || null,
          order_index: tasks.length,
          color: '#3b82f6'
        });

      if (error) {
        console.error('Error adding task:', error);
        toast({
          title: "Error",
          description: "Failed to add task",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Task added successfully",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const deleteTaskFromDatabase = async (taskData: any) => {
    try {
      console.log('Deleting task:', taskData);
      
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskData.taskID);

      if (error) {
        console.error('Error deleting task:', error);
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
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
    { field: 'taskID', headerText: 'ID', width: 80, visible: false }, // Hide UUID column
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

  console.log('Final render - Resources available:', resources.length);
  console.log('Final render - Tasks available:', tasks.length);

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
        actionComplete={actionComplete}
      >
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath]} />
      </GanttComponent>
    </div>
  );
}

export default GanttChart;
