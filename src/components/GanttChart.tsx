import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath, ContextMenu, ColumnsDirective, ColumnDirective, EditDialogFieldsDirective, EditDialogFieldDirective } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GanttIdMapper } from "@/utils/ganttIdMapping";
import { toast } from "@/hooks/use-toast";

// Register Syncfusion license
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cWmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXhfeHVRRmhdUEZ1XEpWYEk=');

interface GanttChartProps {
  projectId: string;
}

function GanttChart({ projectId }: GanttChartProps) {
  const ganttRef = React.useRef<any>(null);
  const idMapper = React.useRef(new GanttIdMapper());
  const queryClient = useQueryClient();

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

      // Transform tasks for Syncfusion
      const transformedTasks = data.map((task) => {
        try {
          return idMapper.current.convertTaskForSyncfusion(task);
        } catch (transformError) {
          console.error('Error transforming task:', task.id, transformError);
          return null;
        }
      }).filter(task => task !== null);

      console.log('Transformed tasks for Gantt:', transformedTasks);
      console.log('Total tasks to render:', transformedTasks.length);
      
      return transformedTasks;
    },
    enabled: !!projectId,
  });

  // Handle database persistence for Syncfusion native operations
  const handleActionComplete = async (args: any) => {
    console.log('=== ActionComplete event ===', args.requestType, 'Full args:', args);

    try {
      switch (args.requestType) {
        case 'save':
          console.log('Handling SAVE operation', args.data);
          if (args.data && args.data.taskID) {
            await handleTaskUpdate(args.data);
          }
          break;
        
        case 'add':
          console.log('Handling ADD operation', args.data);
          if (args.data) {
            await handleTaskAdd(args.data);
          }
          break;
        
        case 'delete':
          if (args.data && args.data.length > 0) {
            await handleTaskDelete(args.data);
          }
          break;
        
        case 'indenting':
        case 'outdenting':
          if (args.data && args.data.length > 0) {
            await handleHierarchyChange(args.data);
          }
          break;
        
        default:
          console.log('Unhandled action type:', args.requestType);
      }
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      
    } catch (error) {
      console.error('Database operation failed:', error);
      toast({
        title: "Save Error",
        description: "Failed to save changes to database. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTaskUpdate = async (syncTask: any) => {
    const uuid = idMapper.current.getUuid(syncTask.taskID);
    if (!uuid) {
      console.error('No UUID found for task ID:', syncTask.taskID);
      return;
    }

    const updateData = {
      task_name: syncTask.taskName,
      start_date: new Date(syncTask.startDate).toISOString(),
      end_date: new Date(syncTask.endDate).toISOString(),
      duration: syncTask.duration || 1,
      progress: syncTask.progress || 0,
      assigned_to: syncTask.resourceInfo?.map((r: any) => r.resourceId).join(',') || null,
      predecessor: Array.isArray(syncTask.dependency) ? syncTask.dependency.join(',') : (syncTask.dependency || ''),
      parent_id: syncTask.parentID ? idMapper.current.getUuid(syncTask.parentID) : null,
    };

    const { error } = await supabase
      .from('project_schedule_tasks')
      .update(updateData)
      .eq('id', uuid);

    if (error) throw error;
    console.log('Task updated successfully:', uuid);
  };

  const handleTaskAdd = async (syncTask: any) => {
    console.log('=== Starting handleTaskAdd ===');
    console.log('Raw syncTask data:', JSON.stringify(syncTask, null, 2));

    try {
      // Validate required fields
      if (!syncTask.taskName || syncTask.taskName.trim() === '') {
        throw new Error('Task name is required');
      }

      // Handle dates with proper validation
      let startDate: Date;
      let endDate: Date;

      if (syncTask.startDate) {
        startDate = new Date(syncTask.startDate);
      } else {
        // Default to today if no start date provided
        startDate = new Date();
      }

      if (syncTask.endDate) {
        endDate = new Date(syncTask.endDate);
      } else {
        // Calculate end date based on duration or default to start date + 1 day
        endDate = new Date(startDate);
        const duration = syncTask.duration || 1;
        endDate.setDate(startDate.getDate() + duration);
      }

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date values provided');
      }

      // Handle parent_id - convert from numeric ID to UUID if provided
      let parentUuid = null;
      if (syncTask.parentID && syncTask.parentID !== null && syncTask.parentID !== undefined) {
        parentUuid = idMapper.current.getUuid(syncTask.parentID);
        console.log('Parent ID conversion:', syncTask.parentID, '->', parentUuid);
      }

      // Handle assigned_to field
      let assignedTo = null;
      if (syncTask.resourceInfo && Array.isArray(syncTask.resourceInfo) && syncTask.resourceInfo.length > 0) {
        assignedTo = syncTask.resourceInfo.map((r: any) => r.resourceId).join(',');
      }

      // Handle predecessor field - ensure it's a string
      let predecessor = '';
      if (syncTask.dependency) {
        if (Array.isArray(syncTask.dependency)) {
          predecessor = syncTask.dependency.join(',');
        } else if (typeof syncTask.dependency === 'string') {
          predecessor = syncTask.dependency;
        }
      }

      const insertData = {
        project_id: projectId,
        task_name: syncTask.taskName.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        duration: Math.max(1, syncTask.duration || 1), // Ensure minimum duration of 1
        progress: Math.max(0, Math.min(100, syncTask.progress || 0)), // Ensure progress is between 0-100
        assigned_to: assignedTo,
        predecessor: predecessor,
        parent_id: parentUuid,
        order_index: syncTask.taskID || 0,
      };

      console.log('Final insert data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Task added successfully:', data);
      
    } catch (error) {
      console.error('Error in handleTaskAdd:', error);
      throw error;
    }
  };

  const handleTaskDelete = async (deletedTasks: any[]) => {
    const uuidsToDelete = deletedTasks
      .map(task => idMapper.current.getUuid(task.taskID))
      .filter(uuid => uuid);

    if (uuidsToDelete.length === 0) {
      console.error('No valid UUIDs found for deletion');
      return;
    }

    const { error } = await supabase
      .from('project_schedule_tasks')
      .delete()
      .in('id', uuidsToDelete);

    if (error) throw error;
    console.log('Tasks deleted successfully:', uuidsToDelete);
  };

  const handleHierarchyChange = async (changedTasks: any[]) => {
    for (const task of changedTasks) {
      const uuid = idMapper.current.getUuid(task.taskID);
      if (!uuid) continue;

      const updateData = {
        parent_id: task.parentID ? idMapper.current.getUuid(task.parentID) : null,
      };

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update(updateData)
        .eq('id', uuid);

      if (error) {
        console.error('Failed to update hierarchy for task:', uuid, error);
        throw error;
      }
    }
    console.log('Hierarchy updated successfully');
  };

  const isLoading = resourcesLoading || tasksLoading;

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

  const splitterSettings = {
    position: "28%"
  };

  const projectStartDate = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())))
    : new Date();
  
  const projectEndDate = tasks.length > 0 
    ? new Date(Math.max(...tasks.map(t => new Date(t.endDate).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Native Syncfusion edit settings - let Syncfusion handle everything
  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    mode: 'Auto' as any,
    newRowPosition: 'Bottom' as any,
  };

  // Standard toolbar - Syncfusion will handle all operations natively
  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'Indent', 'Outdent', 'ExpandAll', 'CollapseAll'];

  // Define custom context menu items - Syncfusion supports string array natively
  const contextMenuItems = ['Add', 'Delete', 'Indent', 'Outdent'];

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
        enableContextMenu={true}
        contextMenuItems={contextMenuItems as any}
        gridLines="Both"
        actionComplete={handleActionComplete}
        enableAdaptiveUI={false}
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
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath, ContextMenu]} />
      </GanttComponent>
    </div>
  );
}

export default GanttChart;
