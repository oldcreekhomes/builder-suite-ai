
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
      
      if (!data || data.length === 0) {
        console.log('No tasks found for project:', projectId);
        return [];
      }

      // Initialize ID mapper with existing tasks
      idMapper.current.initializeFromTasks(data);

      // Transform tasks for Syncfusion with improved dependency handling
      const transformedTasks = data.map((task, index) => {
        try {
          const syncTask = idMapper.current.convertTaskForSyncfusion(task);
          
          // Fix dependency validation - only validate against actual task IDs
          if (syncTask.dependency && typeof syncTask.dependency === 'string') {
            const validTaskIds = new Set(data.map((_, idx) => idx + 1));
            const deps = syncTask.dependency.split(',')
              .map(d => d.trim())
              .filter(d => {
                if (!d) return false;
                if (d === syncTask.taskID.toString()) {
                  console.warn('Removed self-reference dependency for task:', syncTask.taskID);
                  return false;
                }
                // Extract numeric ID from dependency (e.g., "2FS" -> 2)
                const depTaskId = parseInt(d.replace(/[A-Z]+$/i, ''));
                if (isNaN(depTaskId) || !validTaskIds.has(depTaskId)) {
                  console.warn('Removed invalid dependency reference:', d, 'for task:', syncTask.taskID);
                  return false;
                }
                return true;
              });
            syncTask.dependency = deps.length > 0 ? deps.join(',') : '';
          }
          
          return syncTask;
        } catch (transformError) {
          console.error('Error transforming task:', task.id, transformError);
          return {
            taskID: index + 1,
            taskName: task.task_name || `Task ${index + 1}`,
            startDate: task.start_date ? new Date(task.start_date) : new Date(),
            endDate: task.end_date ? new Date(task.end_date) : new Date(),
            duration: task.duration || 1,
            progress: task.progress || 0,
            parentID: null
          };
        }
      }).filter(task => task !== null);

      console.log('Transformed tasks for Gantt:', transformedTasks);
      console.log('Total tasks to render:', transformedTasks.length);
      
      return transformedTasks;
    },
    enabled: !!projectId,
  });

  const isLoading = resourcesLoading || tasksLoading;

  const actionBegin = (args: any) => {
    console.log('=== ACTION BEGIN ===');
    console.log('Request type:', args.requestType);
    console.log('Args data:', args.data);
    console.log('=== END ACTION BEGIN ===');
  };

  const actionComplete = async (args: any) => {
    console.log('=== NATIVE ACTION COMPLETE ===');
    console.log('Request type:', args.requestType);
    console.log('Args data:', args.data);
    console.log('Modified records:', args.modifiedRecords);
    
    try {
      if (args.requestType === 'save' && args.data) {
        console.log('SAVE: Processing save operation');
        await updateSingleTask(args.data);
      } else if (args.requestType === 'add' && args.data) {
        console.log('ADD: Processing add operation');
        await addTaskToDatabase(args.data);
      } else if (args.requestType === 'delete' && args.data) {
        console.log('DELETE: Processing delete operation');
        await deleteTaskFromDatabase(args.data);
      } else if (args.requestType === 'indenting' && args.modifiedRecords) {
        console.log('INDENT: Processing indent with sequential updates');
        await processSequentialHierarchyChange(args.modifiedRecords, 'indented');
      } else if (args.requestType === 'outdenting' && args.modifiedRecords) {
        console.log('OUTDENT: Processing outdent with sequential updates');
        await processSequentialHierarchyChange(args.modifiedRecords, 'outdented');
      }
    } catch (error) {
      console.error('Error in actionComplete:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
    
    console.log('=== END NATIVE ACTION COMPLETE ===');
  };

  // NEW: Sequential processing to fix concurrency issues
  const processSequentialHierarchyChange = async (modifiedRecords: any[], operation: string) => {
    console.log(`=== PROCESS SEQUENTIAL ${operation.toUpperCase()} HIERARCHY ===`);
    console.log('Modified records:', modifiedRecords);
    
    const results = [];
    
    // Process each task sequentially to avoid race conditions
    for (let i = 0; i < modifiedRecords.length; i++) {
      const record = modifiedRecords[i];
      console.log(`Processing ${operation} for task ${i + 1}/${modifiedRecords.length}:`, record.taskID, 'parentID:', record.parentID);
      
      try {
        await updateSingleTaskWithRetry(record, 3); // Retry up to 3 times
        console.log(`✅ Successfully ${operation} task:`, record.taskID);
        results.push({ taskId: record.taskID, success: true });
        
        // Add small delay between updates to prevent database conflicts
        if (i < modifiedRecords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Failed to ${operation} task ${record.taskID}:`, error);
        results.push({ taskId: record.taskID, success: false, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`${operation} Results:`, {
      successful: successful.length,
      failed: failed.length,
      successfulTasks: successful.map(s => s.taskId),
      failedTasks: failed.map(f => `${f.taskId}:${f.error}`)
    });
    
    if (failed.length > 0) {
      console.error(`Some tasks failed to ${operation}:`, failed);
      toast({
        title: "Partial Success", 
        description: `${successful.length} tasks ${operation} successfully, ${failed.length} failed`,
        variant: failed.length > successful.length ? "destructive" : "default",
      });
    } else {
      toast({
        title: "Success",
        description: `All ${successful.length} tasks ${operation} successfully`,
      });
    }
    
    console.log(`=== END PROCESS SEQUENTIAL ${operation.toUpperCase()} HIERARCHY ===`);
  };

  // NEW: Retry logic for failed updates
  const updateSingleTaskWithRetry = async (taskData: any, maxRetries: number = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for task ${taskData.taskID}`);
        await updateSingleTask(taskData);
        console.log(`✅ Task ${taskData.taskID} updated successfully on attempt ${attempt}`);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed for task ${taskData.taskID}:`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 200; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError; // If all retries failed, throw the last error
  };

  // Native Syncfusion cell save handler
  const cellSave = async (args: any) => {
    console.log('=== CELL SAVE EVENT ===');
    console.log('Cell save args:', args);
    
    if (args.data) {
      try {
        await updateSingleTask(args.data);
        console.log('Cell save completed successfully');
      } catch (error) {
        console.error('Cell save failed:', error);
        toast({
          title: "Error",
          description: "Failed to save cell changes",
          variant: "destructive",
        });
      }
    }
    
    console.log('=== END CELL SAVE EVENT ===');
  };

  // Native Syncfusion end edit handler
  const endEdit = async (args: any) => {
    console.log('=== END EDIT EVENT ===');
    console.log('End edit args:', args);
    
    if (args.data) {
      try {
        await updateSingleTask(args.data);
        console.log('End edit save completed successfully');
      } catch (error) {
        console.error('End edit save failed:', error);
      }
    }
    
    console.log('=== END EDIT EVENT ===');
  };

  // Simplified single task update with better error handling
  const updateSingleTask = async (taskData: any) => {
    console.log('=== UPDATE SINGLE TASK ===');
    console.log('Task data:', taskData);
    
    const taskId = taskData.taskID;
    const uuid = idMapper.current.getUuid(taskId);
    
    if (!uuid) {
      throw new Error(`No UUID found for task ID: ${taskId}`);
    }
    
    const dbTask = idMapper.current.convertTaskForDatabase(taskData, projectId);
    
    // Handle resource assignments
    let assignedTo = null;
    if (taskData.resourceInfo) {
      if (typeof taskData.resourceInfo === 'string') {
        const resourceNames = taskData.resourceInfo.split(',').map(name => name.trim());
        const resourceUUIDs = [];
        
        for (const resourceName of resourceNames) {
          const resource = resources.find(r => r.resourceName === resourceName);
          if (resource) {
            resourceUUIDs.push(resource.resourceId);
          }
        }
        
        if (resourceUUIDs.length > 0) {
          assignedTo = resourceUUIDs.join(',');
        }
      } else if (Array.isArray(taskData.resourceInfo)) {
        const resourceIds = taskData.resourceInfo.map((resource: any) => resource.resourceId);
        assignedTo = resourceIds.join(',');
      }
    }
    
    const updateData = {
      task_name: dbTask.task_name,
      start_date: dbTask.start_date,
      end_date: dbTask.end_date,
      duration: dbTask.duration,
      progress: dbTask.progress,
      assigned_to: assignedTo,
      predecessor: dbTask.predecessor,
      parent_id: dbTask.parent_id,
    };
    
    console.log(`Updating task ${taskId} (UUID: ${uuid}) with parent_id: "${updateData.parent_id}"`);
    
    const { error } = await supabase
      .from('project_schedule_tasks')
      .update(updateData)
      .eq('id', uuid);
    
    if (error) {
      console.error('Database update error:', error);
      throw error;
    }
    
    // Simplified verification - just check if the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('project_schedule_tasks')
      .select('id, task_name, parent_id')
      .eq('id', uuid)
      .single();
    
    if (verifyError) {
      console.error('Verification failed:', verifyError);
      throw verifyError;
    }
    
    console.log(`✅ Task ${taskId} verified - parent_id: "${verifyData.parent_id}"`);
    console.log('=== END UPDATE SINGLE TASK ===');
  };

  const addTaskToDatabase = async (taskData: any) => {
    console.log('Adding task:', taskData);
    
    // Get the highest order_index for this project to ensure new tasks are added at the end
    const { data: maxOrderData } = await supabase
      .from('project_schedule_tasks')
      .select('order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: false })
      .limit(1);
    
    const nextOrderIndex = maxOrderData && maxOrderData.length > 0 
      ? (maxOrderData[0].order_index || 0) + 1 
      : 0;
    
    const dbTask = {
      ...idMapper.current.convertTaskForDatabase(taskData, projectId),
      order_index: nextOrderIndex
    };
    
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
    console.log('=== ROW DROP EVENT ===');
    console.log('Row drop event:', args);
    console.log('Drop position:', args.dropPosition);
    console.log('Dragged data:', args.data);
    console.log('Target data:', args.targetData);
    console.log('=== END ROW DROP EVENT ===');
    
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
        newParentId = targetTask.taskID.toString();
        // Get the highest order_index among target's children and add 1
        const { data: siblings } = await supabase
          .from('project_schedule_tasks')
          .select('order_index')
          .eq('parent_id', newParentId)
          .order('order_index', { ascending: false })
          .limit(1);
        newOrderIndex = siblings && siblings.length > 0 ? siblings[0].order_index + 1 : 0;
      } else {
        // Dropped as sibling (above or below)
        if (targetTask && targetTask.parentID) {
          newParentId = targetTask.parentID.toString();
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
    newRowPosition: 'Bottom' as any, // Add new tasks at the bottom
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
        cellSave={cellSave}
        endEdit={endEdit}
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
