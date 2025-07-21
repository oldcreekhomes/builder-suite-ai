
import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu, Filter, DayMarkers, CriticalPath, ContextMenu, ColumnsDirective, ColumnDirective, EditDialogFieldsDirective, EditDialogFieldDirective } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Register Syncfusion license
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cWmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXhfeHVRRmhdUEZ1XEpWYEk=');

interface GanttChartProps {
  projectId: string;
}

function GanttChart({ projectId }: GanttChartProps) {
  const ganttRef = React.useRef<any>(null);
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

  // Fetch tasks using React Query
  const { data: tasks = [], isLoading: tasksLoading, refetch } = useQuery({
    queryKey: ['gantt-tasks', projectId],
    queryFn: async () => {
      console.log('Fetching tasks for project:', projectId);
      
      const { data, error } = await supabase.rpc('get_gantt_tasks_for_project', {
        project_id_param: projectId
      });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      // Transform data for Syncfusion format
      const transformedData = data.map((task: any, index: number) => ({
        TaskID: index + 1,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Progress: task.progress || 0,
        Resources: task.assigned_to ? [task.assigned_to] : [],
        Predecessor: task.predecessor || '',
        ParentID: task.parent_id ? parseInt(task.parent_id) : null,
        subtasks: [],
        OriginalID: task.id
      }));

      console.log('Tasks loaded:', transformedData.length, transformedData);
      return transformedData;
    },
    enabled: !!projectId,
  });

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    resourceInfo: 'Resources',
    dependency: 'Predecessor',
    parentID: 'ParentID',
  };

  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName'
  };

  const labelSettings = {
    leftLabel: 'TaskName'
  };

  const splitterSettings = {
    position: "28%"
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    mode: 'Auto' as any,
    newRowPosition: 'Bottom' as any,
  };

  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'Indent', 'Outdent', 'ExpandAll', 'CollapseAll'];
  const contextMenuItems = ['Add', 'Delete', 'Indent', 'Outdent'] as any;

  // Handle task operations
  const handleActionComplete = async (args: any) => {
    console.log('Action completed:', args.requestType, args);
    
    if (args.requestType === 'save') {
      const task = args.data;
      
      if (args.action === 'add') {
        // Create new task
        const { error } = await supabase.rpc('insert_gantt_task', {
          project_id_param: projectId,
          task_name_param: task.TaskName,
          start_date_param: task.StartDate,
          end_date_param: task.EndDate,
          duration_param: task.Duration || 1,
          progress_param: task.Progress || 0,
          assigned_to_param: Array.isArray(task.Resources) ? task.Resources.join(',') : task.Resources,
          predecessor_param: task.Predecessor || '',
          parent_id_param: task.ParentID ? task.ParentID.toString() : null,
          order_index_param: task.TaskID || 0,
          color_param: '#3b82f6'
        });

        if (error) {
          console.error('Error creating task:', error);
        } else {
          refetch();
        }
      } else if (args.action === 'edit') {
        // Update existing task
        const { error } = await supabase.rpc('update_gantt_task', {
          task_id_param: task.OriginalID,
          task_name_param: task.TaskName,
          start_date_param: task.StartDate,
          end_date_param: task.EndDate,
          duration_param: task.Duration,
          progress_param: task.Progress,
          assigned_to_param: Array.isArray(task.Resources) ? task.Resources.join(',') : task.Resources,
          predecessor_param: task.Predecessor,
          parent_id_param: task.ParentID ? task.ParentID.toString() : null,
          order_index_param: task.TaskID,
          color_param: task.Color || '#3b82f6'
        });

        if (error) {
          console.error('Error updating task:', error);
        } else {
          refetch();
        }
      }
    } else if (args.requestType === 'delete') {
      // Delete task
      const task = args.data[0];
      const { error } = await supabase.rpc('delete_gantt_task', {
        task_id_param: task.OriginalID
      });

      if (error) {
        console.error('Error deleting task:', error);
      } else {
        refetch();
      }
    }
  };

  if (resourcesLoading || tasksLoading) {
    return <div style={{ padding: '10px' }}>Loading schedule...</div>;
  }

  console.log('Final render - Resources available:', resources.length, 'Tasks available:', tasks.length);

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
        projectStartDate={new Date('01/01/2024')} 
        projectEndDate={new Date('12/31/2024')}
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
        contextMenuItems={contextMenuItems}
        gridLines="Both"
        enableAdaptiveUI={false}
        actionComplete={handleActionComplete}
      >
        <ColumnsDirective>
          <ColumnDirective field='TaskID' headerText='ID' width={80} visible={true} isPrimaryKey={true} />
          <ColumnDirective field='TaskName' headerText='Task Name' width={250} clipMode='EllipsisWithTooltip' validationRules={{ required: true, minLength: [3, 'Task name should have a minimum length of 3 characters'] }} />
          <ColumnDirective field='StartDate' headerText='Start Date' width={120} />
          <ColumnDirective field='EndDate' headerText='End Date' width={120} />
          <ColumnDirective field='Duration' headerText='Duration' width={100} validationRules={{ required: true }} />
          <ColumnDirective field='Resources' headerText='Resource' width={200} />
          <ColumnDirective field='Predecessor' headerText='Predecessor' width={150} />
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
