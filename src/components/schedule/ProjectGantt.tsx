
import React, { useEffect } from 'react';
import { 
  GanttComponent, 
  ColumnsDirective, 
  ColumnDirective, 
  Edit, 
  Selection, 
  Toolbar,
  Filter,
  Sort,
  Resize,
  ColumnMenu,
  Inject
} from '@syncfusion/ej2-react-gantt';
import { useProjectSchedule } from '@/hooks/useProjectSchedule';
import { initializeSyncfusion } from '@/utils/syncfusionLicense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectGanttProps {
  projectId: string;
}

export const ProjectGantt: React.FC<ProjectGanttProps> = ({ projectId }) => {
  const { tasks, isLoading, error, createTask, updateTask, deleteTask } = useProjectSchedule(projectId);

  useEffect(() => {
    // Initialize Syncfusion license asynchronously
    initializeSyncfusion().catch(console.error);
  }, []);

  const taskSettings = {
    id: 'id',
    name: 'task_name',
    startDate: 'start_date',
    endDate: 'end_date',
    duration: 'duration',
    progress: 'progress',
    dependency: 'predecessor',
    resourceInfo: 'resources',
    notes: 'notes',
    parentID: 'parent_id'
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true
  };

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll'
  ];

  const handleActionComplete = (args: any) => {
    try {
      if (args.requestType === 'save') {
        if (args.action === 'add') {
          const newTask = {
            project_id: projectId,
            task_name: args.data.task_name || 'New Task',
            start_date: args.data.start_date || new Date().toISOString(),
            end_date: args.data.end_date || new Date().toISOString(),
            duration: args.data.duration || 1,
            progress: args.data.progress || 0,
            predecessor: args.data.predecessor || '',
            resources: args.data.resources || '',
            notes: args.data.notes || '',
            parent_id: args.data.parent_id || null
          };
          createTask.mutate(newTask);
        } else if (args.action === 'edit') {
          updateTask.mutate({
            id: args.data.id,
            task_name: args.data.task_name,
            start_date: args.data.start_date,
            end_date: args.data.end_date,
            duration: args.data.duration,
            progress: args.data.progress,
            predecessor: args.data.predecessor,
            resources: args.data.resources,
            notes: args.data.notes,
            parent_id: args.data.parent_id
          });
        }
      } else if (args.requestType === 'delete') {
        deleteTask.mutate(args.data[0].id);
      }
    } catch (error) {
      console.error('Error in handleActionComplete:', error);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            Error loading schedule: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[600px]">
          <GanttComponent
            dataSource={tasks || []}
            taskFields={taskSettings}
            editSettings={editSettings}
            toolbar={toolbarOptions}
            allowSelection={true}
            allowResizing={true}
            allowSorting={true}
            allowFiltering={true}
            showColumnMenu={true}
            highlightWeekends={true}
            height="100%"
            actionComplete={handleActionComplete}
          >
            <Inject services={[Edit, Selection, Toolbar, Filter, Sort, Resize, ColumnMenu]} />
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="80" isPrimaryKey={true} visible={false} />
              <ColumnDirective field="task_name" headerText="Task Name" width="250" />
              <ColumnDirective field="start_date" headerText="Start Date" width="150" />
              <ColumnDirective field="end_date" headerText="End Date" width="150" />
              <ColumnDirective field="duration" headerText="Duration" width="100" />
              <ColumnDirective field="progress" headerText="Progress" width="100" />
              <ColumnDirective field="resources" headerText="Resources" width="150" />
            </ColumnsDirective>
          </GanttComponent>
        </div>
      </CardContent>
    </Card>
  );
};
