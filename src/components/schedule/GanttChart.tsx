import React, { useRef, useState, useCallback, useMemo } from 'react';
import { registerLicense } from '@syncfusion/ej2-base';
import {
  GanttComponent,
  Inject,
  Selection,
  ColumnsDirective,
  ColumnDirective,
  Toolbar,
  DayMarkers,
  Edit,
  Filter,
  Sort,
  ContextMenu,
  RowDD,
} from "@syncfusion/ej2-react-gantt";
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { transformTasksForGantt } from '@/utils/ganttUtils';

// Register Syncfusion license key
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cXmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXdecXVcR2BZVkF/XkpWYEk=');

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks, isLoading: tasksLoading, error } = useProjectTasks(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { publishSchedule } = usePublishSchedule(projectId);
  
  // State for managing deletions only
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  // Transform database tasks to Syncfusion format  
  const ganttData = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      console.log('📊 No tasks available for Gantt chart');
      return [];
    }
    
    console.log('📊 Processing tasks for Gantt chart:', tasks.length);
    
    // Transform resources to match our interface
    const transformedResources = resources.map((r, index) => ({
      id: index + 1,
      name: r.resourceName
    }));
    
    // Use simplified transformation for native Syncfusion
    const transformedTasks = transformTasksForGantt(tasks, transformedResources);
    console.log('📊 Transformed tasks:', transformedTasks.length);
    
    return transformedTasks;
  }, [tasks, resources]);

  // Task ID mapping for mutations
  const taskIdToOriginalId = useMemo(() => {
    const map = new Map<number, string>();
    ganttData.forEach((task, index) => {
      map.set(index + 1, task.id);
    });
    return map;
  }, [ganttData]);

  // Set up task field mapping for Syncfusion Gantt
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    parentID: 'ParentTaskID',
  };

  // Event handlers
  const handleToolbarClick = useCallback((args: any) => {
    if (args.item?.id === 'publish') {
      publishSchedule({ daysFromToday: '2' });
    }
  }, [publishSchedule]);

  const handleActionBegin = useCallback((args: any) => {
    if (args.requestType === 'delete') {
      args.cancel = true;
      setTaskToDelete(args.data);
    }
  }, []);

  const handleActionComplete = useCallback((args: any) => {
    if (args.requestType === 'save' && args.data) {
      const taskData = args.data;
      const originalId = taskData.id;
      
      updateTask.mutate({
        id: originalId,
        task_name: taskData.TaskName,
        start_date: new Date(taskData.StartDate).toISOString(),
        end_date: new Date(taskData.EndDate).toISOString(),
        duration: parseInt(taskData.Duration) || 1,
        progress: parseInt(taskData.Progress) || 0,
      });
    } else if (args.requestType === 'rowDropped' && args.data) {
      const taskData = args.data;
      const originalId = taskData.id;
      const newParentId = taskData.ParentTaskID ? taskIdToOriginalId.get(taskData.ParentTaskID) : null;
      
      updateTask.mutate({
        id: originalId,
        parent_id: newParentId,
        order_index: args.dropIndex || 0,
      });
    }
  }, [updateTask, taskIdToOriginalId]);

  const handleDeleteConfirmation = useCallback(() => {
    if (taskToDelete) {
      deleteTask.mutate(taskToDelete.id);
      setTaskToDelete(null);
    }
  }, [taskToDelete, deleteTask]);

  const isLoading = tasksLoading || resourcesLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error loading tasks</div>;
  }

  return (
    <div className="w-full h-[600px]">
      <GanttComponent
        ref={ganttRef}
        dataSource={ganttData}
        taskFields={taskFields}
        allowRowDragAndDrop={true}
        allowReordering={true}
        allowResizing={true}
        height="500px"
        editSettings={{
          allowAdding: true,
          allowEditing: true,
          allowDeleting: true,
          allowTaskbarEditing: true,
          showDeleteConfirmDialog: false
        }}
        toolbar={[
          'Add', 'Edit', 'Delete', 'Update', 
          'ExpandAll', 'CollapseAll', 'Indent', 'Outdent',
          { text: 'Publish Schedule', id: 'publish' }
        ]}
        toolbarClick={handleToolbarClick}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
          <ColumnDirective field="StartDate" headerText="Start Date" width="120" />
          <ColumnDirective field="EndDate" headerText="End Date" width="120" />
          <ColumnDirective field="Duration" headerText="Duration" width="100" />
        </ColumnsDirective>
        <Inject services={[Toolbar, Edit, Selection, Filter, Sort, ContextMenu, RowDD, DayMarkers]} />
      </GanttComponent>

      <DeleteConfirmationDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task?"
        onConfirm={handleDeleteConfirmation}
      />
    </div>
  );
};