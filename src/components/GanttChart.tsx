
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

  // Fetch resources from users and company representatives - project-specific caching
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['project-resources', projectId],
    queryFn: async () => {
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

      return allResources;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch and transform schedule tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
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

      return data || [];
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Memoize the transformed tasks to prevent unnecessary re-renders
  const tasks = React.useMemo(() => {
    if (!tasksData || tasksData.length === 0) return [];

    // Initialize ID mapper with existing tasks
    idMapper.current.initializeFromTasks(tasksData);

    // Transform tasks for Syncfusion
    const transformedTasks = tasksData.map((task) => {
      return idMapper.current.convertTaskForSyncfusion(task);
    }).filter(task => task !== null);

    return transformedTasks;
  }, [tasksData]);

  // Memoize project dates to prevent recalculation
  const { projectStartDate, projectEndDate } = React.useMemo(() => {
    if (tasks.length === 0) {
      return {
        projectStartDate: new Date(),
        projectEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    }
    
    return {
      projectStartDate: new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime()))),
      projectEndDate: new Date(Math.max(...tasks.map(t => new Date(t.endDate).getTime())))
    };
  }, [tasks]);

  // Streamlined actionComplete handler - ignore system refresh events
  const handleActionComplete = React.useCallback(async (args: any) => {
    // Ignore system refresh events that cause unnecessary re-renders
    if (args.requestType === 'refresh' || args.requestType === 'filtering' || args.requestType === 'sorting') {
      return;
    }

    try {
      switch (args.requestType) {
        case 'save':
          if (args.data && args.data.taskID) {
            await handleTaskUpdate(args.data);
          }
          break;
        
        case 'add':
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
      }
      
      // Only refresh when necessary - not on every operation
      if (['add', 'delete'].includes(args.requestType)) {
        queryClient.invalidateQueries({ queryKey: ['project-schedule-tasks', projectId] });
      }
      
    } catch (error) {
      console.error('Database operation failed:', error);
      toast({
        title: "Save Error",
        description: "Failed to save changes to database. Please try again.",
        variant: "destructive",
      });
    }
  }, [projectId, queryClient]);

  const handleTaskUpdate = async (syncTask: any) => {
    const uuid = idMapper.current.getUuid(syncTask.taskID);
    if (!uuid) {
      console.error('No UUID found for task ID:', syncTask.taskID);
      return;
    }

    // Simple resource processing
    let assignedTo = null;
    if (syncTask.resourceInfo && Array.isArray(syncTask.resourceInfo) && syncTask.resourceInfo.length > 0) {
      const resourceIds = syncTask.resourceInfo.map((resource: any) => resource.resourceId).filter(id => id);
      if (resourceIds.length > 0) {
        assignedTo = resourceIds.join(',');
      }
    }

    const updateData = {
      task_name: syncTask.taskName,
      start_date: new Date(syncTask.startDate).toISOString(),
      end_date: new Date(syncTask.endDate).toISOString(),
      duration: syncTask.duration || 1,
      progress: syncTask.progress || 0,
      assigned_to: assignedTo,
      predecessor: Array.isArray(syncTask.dependency) ? syncTask.dependency.join(',') : (syncTask.dependency || ''),
      parent_id: syncTask.parentID ? syncTask.parentID.toString() : null,
    };

    const { error } = await supabase
      .from('project_schedule_tasks')
      .update(updateData)
      .eq('id', uuid);

    if (error) throw error;
  };

  const handleTaskAdd = async (syncTask: any) => {
    // Simple resource processing for new tasks
    let assignedTo = null;
    if (syncTask.resourceInfo && Array.isArray(syncTask.resourceInfo) && syncTask.resourceInfo.length > 0) {
      const resourceIds = syncTask.resourceInfo.map((resource: any) => resource.resourceId).filter(id => id);
      if (resourceIds.length > 0) {
        assignedTo = resourceIds.join(',');
      }
    }

    const insertData = {
      project_id: projectId,
      task_name: syncTask.taskName.trim(),
      start_date: new Date(syncTask.startDate).toISOString(),
      end_date: new Date(syncTask.endDate).toISOString(),
      duration: Math.max(1, syncTask.duration || 1),
      progress: Math.max(0, Math.min(100, syncTask.progress || 0)),
      assigned_to: assignedTo,
      predecessor: Array.isArray(syncTask.dependency) ? syncTask.dependency.join(',') : (syncTask.dependency || ''),
      parent_id: syncTask.parentID ? syncTask.parentID.toString() : null,
      order_index: syncTask.taskID || 0,
    };

    const { error } = await supabase
      .from('project_schedule_tasks')
      .insert([insertData]);

    if (error) throw error;
  };

  const handleTaskDelete = async (deletedTasks: any[]) => {
    const uuidsToDelete = deletedTasks
      .map(task => idMapper.current.getUuid(task.taskID))
      .filter(uuid => uuid);

    if (uuidsToDelete.length === 0) return;

    const { error } = await supabase
      .from('project_schedule_tasks')
      .delete()
      .in('id', uuidsToDelete);

    if (error) throw error;
  };

  const handleHierarchyChange = async (changedTasks: any[]) => {
    for (const task of changedTasks) {
      const uuid = idMapper.current.getUuid(task.taskID);
      if (!uuid) continue;

      const updateData = {
        parent_id: task.parentID ? task.parentID.toString() : null,
      };

      const { error } = await supabase
        .from('project_schedule_tasks')
        .update(updateData)
        .eq('id', uuid);

      if (error) throw error;
    }
  };

  const isLoading = resourcesLoading || tasksLoading;

  // Memoize configuration objects to prevent unnecessary re-renders
  const taskFields = React.useMemo(() => ({
    id: 'taskID',
    name: 'taskName',
    startDate: 'startDate',
    endDate: 'endDate',
    duration: 'duration',
    progress: 'progress',
    resourceInfo: 'resourceInfo',
    dependency: 'dependency',
    parentID: 'parentID',
  }), []);

  const resourceFields = React.useMemo(() => ({
    id: 'resourceId',
    name: 'resourceName'
  }), []);

  const editSettings = React.useMemo(() => ({
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    mode: 'Auto' as any,
    newRowPosition: 'Bottom' as any,
  }), []);

  const toolbar = React.useMemo(() => ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'Indent', 'Outdent', 'ExpandAll', 'CollapseAll'], []);
  const contextMenuItems = React.useMemo(() => ['Add', 'Delete', 'Indent', 'Outdent'], []);

  if (isLoading) {
    return <div style={{ padding: '10px' }}>Loading schedule...</div>;
  }

  return (
    <div style={{ padding: '10px' }}>
      <GanttComponent 
        ref={ganttRef}
        id='SyncfusionGantt' 
        dataSource={tasks}
        taskFields={taskFields} 
        resourceFields={resourceFields}
        resources={resources}
        labelSettings={{ leftLabel: 'taskName' }}
        height='500px'
        projectStartDate={projectStartDate} 
        projectEndDate={projectEndDate}
        editSettings={editSettings}
        toolbar={toolbar}
        splitterSettings={{ position: "28%" }}
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
          <ColumnDirective field='taskName' headerText='Task Name' width={250} clipMode='EllipsisWithTooltip' validationRules={{ required: true }} />
          <ColumnDirective field='startDate' headerText='Start Date' width={120} />
          <ColumnDirective field='endDate' headerText='End Date' width={120} />
          <ColumnDirective field='duration' headerText='Duration' width={100} />
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

export default React.memo(GanttChart);
