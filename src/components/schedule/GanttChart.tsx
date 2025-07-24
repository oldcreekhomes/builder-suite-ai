import React, { useRef, useMemo, useState, useEffect } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu, EditSettingsModel } from '@syncfusion/ej2-react-gantt';
import { Edit as TreeGridEdit } from '@syncfusion/ej2-react-treegrid';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { generateNestedHierarchy, findOriginalTaskId, ProcessedTask, convertResourceIdsToNames } from '@/utils/ganttUtils';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import '@/utils/syncfusionOverrides';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskData: any;
    taskName: string;
  }>({ isOpen: false, taskData: null, taskName: '' });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Transform tasks with nested hierarchical structure
  const ganttData = useMemo(() => {
    console.log('=== GANTT DATA TRANSFORMATION START ===');
    console.log('Raw tasks from database:', tasks);
    console.log('Resources available:', resources);
    
    const transformedData = generateNestedHierarchy(tasks, resources);
    console.log('Transformed hierarchical data:', transformedData);
    console.log('=== GANTT DATA TRANSFORMATION END ===');
    
    return transformedData;
  }, [tasks, resources]);

  const taskFields = {
    id: 'TaskID', // Use hierarchical TaskID
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    child: 'subtasks', // Use subtasks for nested hierarchy
  };

  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName',
    group: 'resourceGroup'
  };

  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any,
    newRowPosition: 'Bottom' as any,
    showDeleteConfirmDialog: false
  };

  const columns = [
    { field: 'TaskID', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'TaskName', headerText: 'Task Name', width: 250, allowEditing: true },
    { field: 'StartDate', headerText: 'Start Date', width: 140, allowEditing: true },
    { field: 'EndDate', headerText: 'End Date', width: 140, allowEditing: true },
    { field: 'Duration', headerText: 'Duration', width: 110, allowEditing: true },
    { field: 'Progress', headerText: 'Progress', width: 110, allowEditing: true },
    { field: 'Predecessor', headerText: 'Dependency', width: 140, allowEditing: true },
    { field: 'Resources', headerText: 'Resources', width: 180, allowEditing: true }
  ];

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll',
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 'Indent', 'Outdent'
  ];

  const splitterSettings = {
    columnIndex: 3
  };

  // Calculate project start and end dates
  const projectDates = useMemo(() => {
    if (!ganttData || ganttData.length === 0) return null;
    
    const getAllTasks = (tasks: ProcessedTask[]): ProcessedTask[] => {
      let allTasks: ProcessedTask[] = [];
      tasks.forEach(task => {
        allTasks.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          allTasks = allTasks.concat(getAllTasks(task.subtasks));
        }
      });
      return allTasks;
    };
    
    const allTasks = getAllTasks(ganttData);
    const startDates = allTasks.map(task => new Date(task.StartDate));
    const endDates = allTasks.map(task => new Date(task.EndDate));
    
    return {
      start: new Date(Math.min(...startDates.map(d => d.getTime()))),
      end: new Date(Math.max(...endDates.map(d => d.getTime())))
    };
  }, [ganttData]);

  // Auto-fit columns and scroll to project start after data loads
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      setTimeout(() => {
        ganttRef.current?.fitToProject();
        if (projectDates?.start) {
          ganttRef.current?.scrollToDate(projectDates.start.toISOString());
        }
      }, 100);
    }
  }, [ganttData, projectDates]);

  const handleRowSelected = (args: any) => {
    if (args.data) {
      const originalId = findOriginalTaskId(args.data.TaskID, ganttData);
      setSelectedTaskId(originalId);
      console.log('Row selected - TaskID:', args.data.TaskID, 'Original ID:', originalId);
    }
  };

  const handleToolbarClick = (args: any) => {
    console.log('Toolbar clicked:', args.item.id);
    
    if (args.item.id === ganttRef.current?.element.id + '_add') {
      console.log('Add button clicked - custom handling');
    } else if (args.item.id === ganttRef.current?.element.id + '_zoomtofit') {
      console.log('ZoomToFit clicked');
      setTimeout(() => {
        ganttRef.current?.fitToProject();
      }, 100);
    }
  };

  const handleActionBegin = (args: any) => {
    console.log('Action begin:', args.requestType, args);
    
    if (args.requestType === 'delete' && args.data) {
      args.cancel = true; // Cancel the default delete
      const taskName = args.data[0]?.TaskName || 'Unknown Task';
      setDeleteConfirmation({
        isOpen: true,
        taskData: args.data[0],
        taskName: taskName
      });
    }
  };

  const handleDeleteConfirmation = () => {
    if (deleteConfirmation.taskData) {
      const originalId = findOriginalTaskId(deleteConfirmation.taskData.TaskID, ganttData);
      if (originalId) {
        deleteTask.mutate(originalId, {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Task deleted successfully",
            });
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "Error",
              description: `Failed to delete task: ${error.message}`,
            });
          }
        });
      }
    }
    setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
  };

  // Helper function to find parent UUID from hierarchical TaskID
  const findParentFromHierarchy = (hierarchicalId: string, ganttData: ProcessedTask[]): string | null => {
    const parts = hierarchicalId.split('.');
    if (parts.length <= 1) return null; // Root task has no parent
    
    const parentHierarchicalId = parts.slice(0, -1).join('.');
    return findOriginalTaskId(parentHierarchicalId, ganttData);
  };

  const handleActionComplete = (args: any) => {
    console.log('=== ACTION COMPLETE ===');
    console.log('Request type:', args.requestType);
    console.log('Args data:', args.data);
    console.log('Args modifiedRecords:', args.modifiedRecords);
    console.log('========================');
    
    const handleMutationError = (error: any, operation: string) => {
      console.error(`${operation} failed:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${operation.toLowerCase()}: ${error.message}`,
      });
    };
    
    const handleMutationSuccess = (operation: string) => {
      console.log(`${operation} succeeded`);
      toast({
        title: "Success",
        description: `Task ${operation.toLowerCase()} successfully`,
      });
    };
    
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      console.log('=== CREATING NEW TASK ===');
      console.log('Task data:', taskData);
      
      // Find parent ID from hierarchical structure
      let parentId = null;
      if (taskData.TaskID && taskData.TaskID.includes('.')) {
        parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
      }
      
      console.log('Determined parent ID:', parentId);
      
      const createParams = {
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate ? taskData.StartDate.toISOString() : new Date().toISOString(),
        end_date: taskData.EndDate ? taskData.EndDate.toISOString() : new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        resources: convertResourceIdsToNames(taskData.Resources, resources) || null,
        parent_id: parentId,
        order_index: tasks.length,
      };
      
      console.log('CREATE TASK PARAMS:', createParams);
      createTask.mutate(createParams, {
        onSuccess: () => handleMutationSuccess('Create'),
        onError: (error) => handleMutationError(error, 'Create')
      });
    } 
    else if ((args.requestType === 'save' || args.requestType === 'cellSave') && args.data) {
      const taskData = args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('UPDATING TASK:', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        const updateParams = {
          id: originalTaskId,
          task_name: taskData.TaskName,
          start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined,
          end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
          duration: taskData.Duration,
          progress: taskData.Progress,
          predecessor: taskData.Predecessor || null,
          resources: convertResourceIdsToNames(taskData.Resources, resources) || null,
        };
        
        console.log('UPDATE TASK PARAMS:', updateParams);
        updateTask.mutate(updateParams, {
          onSuccess: () => handleMutationSuccess('Update'),
          onError: (error) => handleMutationError(error, 'Update')
        });
      }
    }
    else if (args.requestType === 'indented' && args.data && args.data.length > 0) {
      console.log('=== INDENTING TASK ===');
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      // Find the new parent (the task above this one at the same level)
      const parentTaskId = findParentFromHierarchy(taskData.TaskID, ganttData);
      
      console.log('Indenting task:', taskData.TaskName, 'Original ID:', originalTaskId, 'New parent ID:', parentTaskId);
      
      if (originalTaskId) {
        updateTask.mutate({
          id: originalTaskId,
          parent_id: parentTaskId
        }, {
          onSuccess: () => handleMutationSuccess('Indent'),
          onError: (error) => handleMutationError(error, 'Indent')
        });
      }
    }
    else if (args.requestType === 'outdented' && args.data && args.data.length > 0) {
      console.log('=== OUTDENTING TASK ===');
      const taskData = args.data[0];
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      // For outdenting, find the grandparent or set to null if becoming root
      const currentParentId = findParentFromHierarchy(taskData.TaskID, ganttData);
      let newParentId = null;
      
      if (currentParentId) {
        // Find the grandparent
        const currentParentTask = ganttData.find(t => findOriginalTaskId(t.TaskID, ganttData) === currentParentId);
        if (currentParentTask && currentParentTask.TaskID.includes('.')) {
          newParentId = findParentFromHierarchy(currentParentTask.TaskID, ganttData);
        }
      }
      
      console.log('Outdenting task:', taskData.TaskName, 'Original ID:', originalTaskId, 'New parent ID:', newParentId);
      
      if (originalTaskId) {
        updateTask.mutate({
          id: originalTaskId,
          parent_id: newParentId
        }, {
          onSuccess: () => handleMutationSuccess('Outdent'),
          onError: (error) => handleMutationError(error, 'Outdent')
        });
      }
    }
  };

  const handleResizeStart = () => {
    console.log('Resize start');
  };

  const handleResizeStop = () => {
    console.log('Resize stop');
  };

  const handleSplitterResized = () => {
    console.log('Splitter resized');
  };

  const handleColumnMenuClick = () => {
    console.log('Column menu clicked');
  };

  const handleColumnMenuOpen = () => {
    console.log('Column menu opened');
  };

  const handleContextMenuClick = () => {
    console.log('Context menu clicked');
  };

  const handleContextMenuOpen = () => {
    console.log('Context menu opened');
  };

  if (isLoading || resourcesLoading) {
    return <div className="flex items-center justify-center h-64">Loading Gantt chart...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error loading tasks: {error.message}</div>;
  }

  return (
    <div className="w-full h-full">
      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' })}
        onConfirm={handleDeleteConfirmation}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.taskName}"? This action cannot be undone.`}
      />
      
      <GanttComponent
        ref={ganttRef}
        dataSource={ganttData}
        taskFields={taskFields}
        resourceFields={resourceFields}
        resources={resources}
        editSettings={editSettings}
        columns={columns}
        toolbar={toolbarOptions}
        splitterSettings={splitterSettings}
        height="600px"
        allowSelection={true}
        allowResizing={true}
        allowSorting={true}
        allowReordering={true}
        allowFiltering={true}
        allowExcelExport={true}
        allowPdfExport={true}
        showColumnMenu={true}
        highlightWeekends={true}
        enableContextMenu={true}
        allowKeyboard={true}
        allowRowDragAndDrop={true}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        rowSelected={handleRowSelected}
        toolbarClick={handleToolbarClick}
        resizeStart={handleResizeStart}
        resizeStop={handleResizeStop}
        splitterResized={handleSplitterResized}
        columnMenuClick={handleColumnMenuClick}
        columnMenuOpen={handleColumnMenuOpen}
        contextMenuClick={handleContextMenuClick}
        contextMenuOpen={handleContextMenuOpen}
      >
        <ColumnsDirective>
          {columns.map((col, index) => (
            <ColumnDirective key={index} {...col} />
          ))}
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu, TreeGridEdit]} />
      </GanttComponent>
    </div>
  );
};