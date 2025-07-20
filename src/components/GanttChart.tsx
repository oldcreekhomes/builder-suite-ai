import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath, ColumnsDirective, ColumnDirective, EditDialogFieldsDirective, EditDialogFieldDirective } from '@syncfusion/ej2-react-gantt';
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

  // Fetch resources from users and company representatives
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['company-resources'],
    queryFn: async () => {
      console.log('Fetching company users and representatives');
      
      // Fetch company users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Fetch company representatives
      const { data: representatives, error: repsError } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, email');

      if (repsError) {
        console.error('Error fetching representatives:', repsError);
        throw repsError;
      }

      // Transform to Syncfusion resource format
      const allResources = [
        ...(users || []).map(user => ({
          resourceId: user.id,
          resourceName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        })),
        ...(representatives || []).map(rep => ({
          resourceId: rep.id,
          resourceName: `${rep.first_name} ${rep.last_name}`.trim() || rep.email,
        }))
      ];

      console.log('Company resources loaded:', allResources.length, allResources);
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

      // Transform tasks for Syncfusion and clean up dependencies
      const transformedTasks = data.map((task) => {
        const syncTask = idMapper.current.convertTaskForSyncfusion(task);
        // Clean up dependencies to prevent circular references
        if (syncTask.dependency && typeof syncTask.dependency === 'string') {
          // Remove any self-references and validate dependency format
          const deps = syncTask.dependency.split(',').map(d => d.trim()).filter(d => d && d !== syncTask.taskID.toString());
          syncTask.dependency = deps.join(',');
        }
        return syncTask;
      });

      console.log('Transformed tasks for Gantt:', transformedTasks);
      return transformedTasks;
    },
    enabled: !!projectId,
  });

  const isLoading = resourcesLoading || tasksLoading;

  const actionBegin = (args: any) => {
    console.log('Action begin:', args.requestType, args);
    
    // Handle validation and pre-processing like in the working example
    if (args.columnName === "endDate" || args.requestType === "beforeOpenAddDialog" || args.requestType === "beforeOpenEditDialog") {
      // Pre-processing for date validation if needed
    }
  };

  const actionComplete = async (args: any) => {
    console.log('Action complete:', args.requestType, args.data);
    
    try {
      // Handle task operations
      if (args.requestType === 'save' && args.data) {
        await updateTaskInDatabase(args.data);
      } else if (args.requestType === 'add' && args.data) {
        await addTaskToDatabase(args.data);
      } else if (args.requestType === 'delete' && args.data) {
        await deleteTaskFromDatabase(args.data);
      }
      // Resource operations are not needed since we manage resources via users/representatives tables
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
    console.log('Updating task with resource info:', taskData);
    
    const dbTask = idMapper.current.convertTaskForDatabase(taskData, projectId);
    
    // Extract resource assignments from Syncfusion's resourceInfo
    let assignedTo = null;
    if (taskData.resourceInfo) {
      console.log('Raw resourceInfo:', taskData.resourceInfo);
      
      // Handle when resourceInfo is a string (resource name or comma-separated names)
      if (typeof taskData.resourceInfo === 'string') {
        // Split by comma in case of multiple resources
        const resourceNames = taskData.resourceInfo.split(',').map(name => name.trim());
        const resourceUUIDs = [];
        
        for (const resourceName of resourceNames) {
          const resource = resources.find(r => r.resourceName === resourceName);
          if (resource) {
            resourceUUIDs.push(resource.resourceId);
            console.log('Found resource by name:', resourceName, '-> UUID:', resource.resourceId);
          }
        }
        
        if (resourceUUIDs.length > 0) {
          assignedTo = resourceUUIDs.join(',');
          console.log('Final assigned resources:', assignedTo);
        }
      }
      // Handle when resourceInfo is an array
      else if (Array.isArray(taskData.resourceInfo) && taskData.resourceInfo.length > 0) {
        const resourceIds = taskData.resourceInfo.map((resource: any) => resource.resourceId);
        assignedTo = resourceIds.join(',');
        console.log('Extracted resource assignments from array:', assignedTo);
      }
    }
    
    const { error } = await supabase
      .from('project_schedule_tasks')
      .update({
        task_name: dbTask.task_name,
        start_date: dbTask.start_date,
        end_date: dbTask.end_date,
        duration: dbTask.duration,
        progress: dbTask.progress,
        assigned_to: assignedTo, // Save the extracted resource assignments
        predecessor: dbTask.predecessor,
        parent_id: dbTask.parent_id,
      })
      .eq('id', dbTask.id);

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    console.log('Task updated successfully with resource assignments:', assignedTo);
    toast({
      title: "Success",
      description: "Task updated successfully",
    });
    
    // DON'T invalidate queries to prevent ID remapping and row shuffling
    // queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
  };

  const addTaskToDatabase = async (taskData: any) => {
    console.log('Adding task:', taskData);
    
    const dbTask = idMapper.current.convertTaskForDatabase(taskData, projectId);
    
    // Extract resource assignments for new tasks too
    if (taskData.resourceInfo && Array.isArray(taskData.resourceInfo) && taskData.resourceInfo.length > 0) {
      const resourceIds = taskData.resourceInfo.map((resource: any) => resource.resourceId);
      dbTask.assigned_to = resourceIds.join(',');
    }
    
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
    
    // DON'T invalidate queries to let Syncfusion handle UI updates natively
    // This prevents the double screen flash and maintains focus
  };

  const deleteTaskFromDatabase = async (taskData: any) => {
    console.log('Deleting task:', taskData);
    
    // Handle both single task and array of tasks for delete
    const tasksToDelete = Array.isArray(taskData) ? taskData : [taskData];
    
    for (const task of tasksToDelete) {
      // For delete operations, Syncfusion might pass taskID directly or in different structure
      const taskId = task.taskID || task.taskData?.taskID || task.ganttProperties?.taskId;
      
      console.log('Attempting to delete task with ID:', taskId);
      
      const uuid = idMapper.current.getUuid(taskId);
      if (!uuid) {
        console.error('Could not find UUID for task ID:', taskId);
        throw new Error(`Task UUID not found for ID: ${taskId}`);
      }
      
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', uuid);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
      
      console.log('Successfully deleted task:', uuid);
    }

    toast({
      title: "Success",
      description: `Deleted ${tasksToDelete.length} task(s) successfully`,
    });
    
    queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
  };

  const rowDrop = async (args: any) => {
    console.log('Row drop event:', args);
    
    try {
      // Get the dragged task data
      const draggedData = args.data;
      const dropPosition = args.dropPosition;
      const targetTask = args.targetData;
      
      console.log('Dragged task:', draggedData);
      console.log('Drop position:', dropPosition);
      console.log('Target task:', targetTask);
      
      // Update order_index and parent_id based on the drop
      const updates = [];
      
      // Get the UUID of the dragged task
      const draggedUuid = idMapper.current.getUuid(draggedData.taskID);
      if (!draggedUuid) {
        throw new Error(`Task UUID not found for dragged task: ${draggedData.taskID}`);
      }
      
      // Handle parent_id update based on drop position
      let newParentId = null;
      let newOrderIndex = 0;
      
      if (dropPosition === 'child' && targetTask) {
        // Dropped as child of target task
        const targetUuid = idMapper.current.getUuid(targetTask.taskID);
        newParentId = targetUuid;
        // Get the highest order_index among target's children and add 1
        const { data: siblings } = await supabase
          .from('project_schedule_tasks')
          .select('order_index')
          .eq('parent_id', targetUuid)
          .order('order_index', { ascending: false })
          .limit(1);
        newOrderIndex = siblings && siblings.length > 0 ? siblings[0].order_index + 1 : 0;
      } else {
        // Dropped as sibling (above or below)
        if (targetTask && targetTask.parentID) {
          const targetParentUuid = idMapper.current.getUuid(targetTask.parentID);
          newParentId = targetParentUuid;
        } else {
          newParentId = null; // Root level
        }
        
        // Calculate new order based on position relative to target
        if (targetTask) {
          if (dropPosition === 'bottomSegment') {
            newOrderIndex = targetTask.index + 1;
          } else {
            newOrderIndex = targetTask.index;
          }
        }
      }
      
      // Update the dragged task
      const { error: updateError } = await supabase
        .from('project_schedule_tasks')
        .update({
          parent_id: newParentId,
          order_index: newOrderIndex
        })
        .eq('id', draggedUuid);
      
      if (updateError) {
        console.error('Error updating dragged task:', updateError);
        throw updateError;
      }
      
      // For now, we'll rely on the simple update above
      // A more sophisticated reordering system can be added later if needed
      
      console.log('Row drop completed successfully');
      
      toast({
        title: "Success",
        description: "Task reordered successfully",
      });
      
      // Refresh the data to reflect the changes
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Error in rowDrop:', error);
      toast({
        title: "Error",
        description: "Failed to reorder task",
        variant: "destructive",
      });
    }
  };

  const taskFields = {
    id: 'taskID',
    name: 'taskName',
    startDate: 'startDate',
    endDate: 'endDate',
    duration: 'duration',
    progress: 'progress',
    resourceInfo: 'resourceInfo', // This maps to Syncfusion's native resource management
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

  const splitterSettings = {
    position: "28%"
  };

  const projectStartDate = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())))
    : new Date();
  
  const projectEndDate = tasks.length > 0 
    ? new Date(Math.max(...tasks.map(t => new Date(t.endDate).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Configure edit settings for inline cell editing
  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    mode: 'Auto' as any, // This enables both dialog and inline editing
  };

  // Toolbar with Edit/Update/Cancel buttons like the working example
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
        allowRowDragAndDrop={true}
        gridLines="Both"
        actionBegin={actionBegin}
        actionComplete={actionComplete}
        rowDrop={rowDrop}
      >
        <ColumnsDirective>
          <ColumnDirective field='taskID' headerText='ID' width={80} visible={true} isPrimaryKey={true} />
          <ColumnDirective field='taskName' headerText='Task Name' width={250} clipMode='EllipsisWithTooltip' validationRules={{ required: true, minLength: [3, 'Task name should have a minimum length of 3 characters'] }} />
          <ColumnDirective field='startDate' headerText='Start Date' width={120} />
          <ColumnDirective field='endDate' headerText='End Date' width={120} />
          <ColumnDirective field='duration' headerText='Duration' width={100} validationRules={{ required: true }} />
          <ColumnDirective field='resourceInfo' headerText='Resource' width={200} />
          <ColumnDirective field='dependency' headerText='Predecessor' width={150} />
        </ColumnsDirective>
        <EditDialogFieldsDirective>
          <EditDialogFieldDirective type='General' headerText='General' />
          <EditDialogFieldDirective type='Dependency' />
          <EditDialogFieldDirective type='Resources' />
          <EditDialogFieldDirective type='Notes' />
        </EditDialogFieldsDirective>
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath]} />
      </GanttComponent>
    </div>
  );
}

export default GanttChart;
