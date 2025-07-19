
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GanttIdMapper } from "@/utils/ganttIdMapping";

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
  const idMapper = React.useRef(new GanttIdMapper());

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

  // Fetch and transform schedule tasks
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

      // Initialize ID mapper with existing tasks
      idMapper.current.initializeFromTasks(data);

      // Transform tasks for Syncfusion
      const transformedTasks = data.map((task) => 
        idMapper.current.convertTaskForSyncfusion(task)
      );

      console.log('Transformed tasks for Gantt:', transformedTasks);
      return transformedTasks;
    },
    enabled: !!projectId && !resourcesLoading,
  });

  const isLoading = resourcesLoading || tasksLoading;

  const actionComplete = async (args: any) => {
    console.log('Action complete:', args.requestType, args.data);
    
    try {
      if (args.requestType === 'save' && args.data) {
        await updateTaskInDatabase(args.data);
      } else if (args.requestType === 'add' && args.data) {
        await addTaskToDatabase(args.data);
      } else if (args.requestType === 'delete' && args.data) {
        await deleteTaskFromDatabase(args.data);
      }
    } catch (error) {
      console.error('Error in actionComplete:', error);
      toast({
        title: "Error",
        description: "Failed to perform operation",
        variant: "destructive",
      });
    }
  };

  const updateTaskInDatabase = async (taskData: any) => {
    console.log('Updating task:', taskData);
    
    const dbTask = idMapper.current.convertTaskForDatabase(taskData, projectId);
    
    const { error } = await supabase
      .from('project_schedule_tasks')
      .update({
        task_name: dbTask.task_name,
        start_date: dbTask.start_date,
        end_date: dbTask.end_date,
        duration: dbTask.duration,
        progress: dbTask.progress,
        assigned_to: dbTask.assigned_to,
        predecessor: dbTask.predecessor,
        parent_id: dbTask.parent_id,
      })
      .eq('id', dbTask.id);

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    toast({
      title: "Success",
      description: "Task updated successfully",
    });
    
    queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
  };

  const addTaskToDatabase = async (taskData: any) => {
    console.log('Adding task:', taskData);
    
    const dbTask = idMapper.current.convertTaskForDatabase(taskData, projectId);
    
    const { error } = await supabase
      .from('project_schedule_tasks')
      .insert(dbTask);

    if (error) {
      console.error('Error adding task:', error);
      throw error;
    }

    toast({
      title: "Success",
      description: "Task added successfully",
    });
    
    queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
  };

  const deleteTaskFromDatabase = async (taskData: any) => {
    console.log('Deleting task:', taskData);
    
    const uuid = idMapper.current.getUuid(taskData.taskID);
    if (!uuid) {
      console.error('Could not find UUID for task:', taskData.taskID);
      throw new Error('Task UUID not found');
    }
    
    const { error } = await supabase
      .from('project_schedule_tasks')
      .delete()
      .eq('id', uuid);

    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }

    toast({
      title: "Success",
      description: "Task deleted successfully",
    });
    
    queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
  };

  // Syncfusion field mapping
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
    { field: 'taskID', headerText: 'ID', width: 80, visible: false },
    { field: 'taskName', headerText: 'Task Name', width: 250, editType: 'stringedit' },
    { field: 'startDate', headerText: 'Start Date', width: 120, editType: 'datepickeredit' },
    { field: 'duration', headerText: 'Duration', width: 100, editType: 'numericedit' },
    { field: 'endDate', headerText: 'End Date', width: 120, editType: 'datepickeredit' },
    { 
      field: 'resourceInfo', 
      headerText: 'Resource', 
      width: 200,
      editType: 'dropdownedit'
    },
    { field: 'dependency', headerText: 'Predecessor', width: 150, editType: 'stringedit' },
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

  // Configure inline editing - this is the key change!
  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    mode: 'Cell' as any, // This enables inline cell editing without popups
    newRowPosition: 'Bottom' as any // New tasks appear at bottom of list
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
