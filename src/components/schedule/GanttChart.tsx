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

  // Transform tasks with nested hierarchical structure and comprehensive debugging
  const ganttData = useMemo(() => {
    console.log('=== GANTT DATA TRANSFORMATION START ===');
    console.log('Raw tasks from database:', tasks);
    console.log('Task count:', tasks.length);
    console.log('Resources available:', resources);
    
    // Log parent-child relationships in raw data using parent_id system
    const parentChildMap = new Map();
    tasks.forEach(task => {
      if (task.parent_id) {
        if (!parentChildMap.has(task.parent_id)) {
          parentChildMap.set(task.parent_id, []);
        }
        parentChildMap.get(task.parent_id).push(task.id);
      }
    });
    console.log('Parent-child relationships in database (parent_id):', Object.fromEntries(parentChildMap));
    
    const transformedData = generateNestedHierarchy(tasks, resources);
    console.log('Transformed hierarchical data:', transformedData);
    console.log('=== GANTT DATA TRANSFORMATION END ===');
    
    return transformedData;
  }, [tasks, resources]);

  const taskFields = {
    id: 'task_number', // Use task_number for Gantt component IDs
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
    mode: 'Auto' as any, // Auto mode enables cell editing by double-clicking
    newRowPosition: 'Bottom' as any,
    showDeleteConfirmDialog: false // Disable Syncfusion's native delete confirmation
  };

  const columns = [
    { field: 'task_number', headerText: 'ID', width: 80, isPrimaryKey: true },
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

  // Calculate dynamic project dates based on actual task data
  const { projectStartDate, projectEndDate } = useMemo(() => {
    if (ganttData.length === 0) {
      // Fallback dates when no tasks exist
      const today = new Date();
      return {
        projectStartDate: today,
        projectEndDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from today
      };
    }

    // Find all start and end dates from the flat task structure
    const getAllDates = (tasks: ProcessedTask[]): { starts: Date[], ends: Date[] } => {
      const starts: Date[] = [];
      const ends: Date[] = [];
      
      const collectDates = (taskList: ProcessedTask[]) => {
        taskList.forEach(task => {
          if (task.StartDate) starts.push(new Date(task.StartDate));
          if (task.EndDate) ends.push(new Date(task.EndDate));
          if (task.subtasks && task.subtasks.length > 0) {
            collectDates(task.subtasks);
          }
        });
      };
      
      collectDates(tasks);
      return { starts, ends };
    };

    const { starts, ends } = getAllDates(ganttData);
    
    // Calculate min start date and max end date
    const minStartDate = starts.length > 0 ? new Date(Math.min(...starts.map(d => d.getTime()))) : new Date();
    const maxEndDate = ends.length > 0 ? new Date(Math.max(...ends.map(d => d.getTime()))) : new Date();
    
    // No buffers - use exact task dates for tight ZoomToFit
    const bufferStart = minStartDate;
    const bufferEnd = maxEndDate;
    
    return {
      projectStartDate: bufferStart,
      projectEndDate: bufferEnd
    };
  }, [ganttData]);

  // Auto-fit columns and scroll to project start date
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      // Use a small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        ganttRef.current?.autoFitColumns();
        // Scroll to project start date to align timeline with tree grid
        if (projectStartDate) {
          ganttRef.current?.scrollToDate(projectStartDate.toISOString().split('T')[0]);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [ganttData, projectStartDate]);

  // Simplified parent detection using selected task and TaskID pattern
  const findParentFromHierarchy = (taskId: string, allTasks: ProcessedTask[]): string | null => {
    console.log('=== SIMPLIFIED PARENT DETECTION ===');
    console.log(`Finding parent for task ID: ${taskId}`);
    console.log('Selected task ID:', selectedTaskId);
    
    // Method 1: Use the currently selected task as parent (most reliable)
    if (selectedTaskId) {
      console.log(`Using selected task as parent: ${selectedTaskId}`);
      return selectedTaskId;
    }
    
    // Method 2: Parse TaskID pattern for hierarchical structure
    const taskIdStr = String(taskId);
    const taskIdParts = taskIdStr.split('.');
    console.log('TaskID parts:', taskIdParts);
    
    if (taskIdParts.length > 1) {
      // Remove the last part to get parent TaskID
      const parentTaskId = taskIdParts.slice(0, -1).join('.');
      console.log('Calculated parent TaskID from pattern:', parentTaskId);
      
      // Find the parent's original ID
      const parentOriginalId = findOriginalTaskId(parentTaskId, allTasks);
      if (parentOriginalId) {
        console.log(`Parent found via TaskID pattern: ${parentOriginalId}`);
        return parentOriginalId;
      }
    }
    
    console.log('No parent found - will be root level task (parent_id will be null)');
    return null;
  };

  // Handle row selection to track potential parent tasks
  const handleRowSelected = (args: any) => {
    console.log('=== ROW SELECTED ===');
    console.log('Selected task data:', args.data);
    
    if (args.data?.TaskID) {
      const originalId = findOriginalTaskId(args.data.TaskID, ganttData);
      console.log(`Setting selected task ID: ${originalId} (from TaskID: ${args.data.TaskID})`);
      setSelectedTaskId(originalId);
    }
  };

  const handleToolbarClick = (args: any) => {
    console.log('=== TOOLBAR CLICK ===');
    console.log('args.item details:', {
      id: args.item?.id,
      text: args.item?.text,
      tooltipText: args.item?.tooltipText
    });
    console.log('===================');
    
    // Check multiple possible ways the Add button might be identified
    const isAddButton = args.item?.id === 'gantt_add' || 
                       args.item?.text === 'Add' || 
                       args.item?.id === 'Add' ||
                       args.item?.tooltipText === 'Add';
    
    // Check for ZoomToFit button to override default behavior
    const isZoomToFitButton = args.item?.id === 'gantt_zoomtofit' || 
                             args.item?.text === 'ZoomToFit' || 
                             args.item?.id === 'ZoomToFit' ||
                             args.item?.tooltipText === 'Zoom to fit';
    
    console.log('Is Add button?', isAddButton);
    console.log('Is ZoomToFit button?', isZoomToFitButton);
    
    if (isAddButton) {
      console.log('Add button detected! Preventing default and adding task...');
      // Prevent the default add dialog from opening
      args.cancel = true;
      
      // Use Syncfusion's native addRecord with minimal data
      if (ganttRef.current) {
        console.log('Adding record using native Syncfusion method...');
        ganttRef.current.addRecord({
          TaskName: 'New Task',
          Duration: 1,
          Progress: 0
        }, 'Bottom');
      }
      
      return;
    } else if (isZoomToFitButton) {
      console.log('ZoomToFit button detected! Using custom fit logic...');
      // Prevent default ZoomToFit behavior that adds extra padding
      args.cancel = true;
      
      if (ganttRef.current && projectStartDate && projectEndDate) {
        console.log('Custom ZoomToFit - setting exact project timeline...');
        // Set the exact project dates without any buffer
        ganttRef.current.timelineSettings = {
          ...ganttRef.current.timelineSettings,
          timelineUnitSize: 40
        };
        
        // Use fitToProject method which should respect our exact dates
        ganttRef.current.fitToProject();
      }
      
      return;
    } else {
      console.log('Other toolbar action, continuing...');
    }
  };

  const handleActionBegin = (args: any) => {
    console.log('=== ACTION BEGIN ===');
    console.log('Request type:', args.requestType);
    console.log('Action data:', args.data);
    console.log('===================');
    
    // Remove the beforeAdd cancellation - let Syncfusion handle it naturally
    if (args.requestType === 'beforeEdit') {
      console.log('Before editing task:', args.data);
    } else if (args.requestType === 'beforeDelete') {
      console.log('Before deleting task:', args.data);
      // Cancel the default delete and show custom confirmation
      args.cancel = true;
      const taskData = args.data[0];
      setDeleteConfirmation({
        isOpen: true,
        taskData: taskData,
        taskName: taskData.TaskName || 'Unknown Task'
      });
    }
  };

  const handleDeleteConfirmation = () => {
    if (deleteConfirmation.taskData) {
      const taskData = deleteConfirmation.taskData;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('DELETING TASK:', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        deleteTask.mutate(originalTaskId, {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Task deleted successfully",
            });
            setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
          },
          onError: (error) => {
            console.error('Delete failed:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: `Failed to delete task: ${error.message}`,
            });
            setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
          }
        });
      }
    }
  };

  const handleActionComplete = (args: any) => {
    console.log('=== ACTION COMPLETE SIMPLIFIED ===');
    console.log('Request type:', args.requestType);
    console.log('Action data:', args.data);
    
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      console.log('Creating new task:', taskData.TaskName);
      
      // Simple parent detection - only for hierarchical TaskIDs
      let parentId = null;
      if (taskData.TaskID && taskData.TaskID.includes('.')) {
        parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
      }
      
      createTask.mutate({
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate || new Date().toISOString(),
        end_date: taskData.EndDate || new Date().toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        parent_id: parentId,
        predecessor: taskData.Predecessor,
        resources: taskData.Resources
      }, {
        onSuccess: () => toast({ title: "Success", description: "Task created successfully" }),
        onError: (error) => toast({ variant: "destructive", title: "Error", description: `Failed to create task: ${error.message}` })
      });
    }
    else if (args.requestType === 'save' && args.data) {
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      console.log('Saving task:', taskData.TaskName);
      
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      if (!originalTaskId) return;
      
      const updateData: any = {};
      if (taskData.TaskName !== undefined) updateData.task_name = taskData.TaskName;
      if (taskData.StartDate !== undefined) updateData.start_date = taskData.StartDate;
      if (taskData.EndDate !== undefined) updateData.end_date = taskData.EndDate;
      if (taskData.Duration !== undefined) updateData.duration = taskData.Duration;
      if (taskData.Progress !== undefined) updateData.progress = taskData.Progress;
      if (taskData.Resources !== undefined) updateData.resources = taskData.Resources;
      if (taskData.Predecessor !== undefined) updateData.predecessor = taskData.Predecessor;
      
      updateTask.mutate({ id: originalTaskId, ...updateData }, {
        onSuccess: () => toast({ title: "Success", description: "Task saved successfully" }),
        onError: (error) => toast({ variant: "destructive", title: "Error", description: `Failed to save task: ${error.message}` })
      });
    }
    // FIXED indenting logic - find the proper parent task
    else if (args.requestType === 'indented' && args.data) {
      console.log('=== IMPROVED INDENT LOGIC ===');
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (!originalTaskId) {
        console.log('No original task ID found for:', taskData.TaskID);
        return;
      }
      
      console.log('Indenting task:', { TaskID: taskData.TaskID, originalId: originalTaskId, currentLevel: taskData.level });
      
      // Find the appropriate parent by traversing backward in the flat data
      let parentId = null;
      if (ganttRef.current?.flatData) {
        const currentIndex = ganttRef.current.flatData.findIndex((task: any) => (task as any).TaskID === taskData.TaskID);
        console.log('Current task index:', currentIndex, 'of', ganttRef.current.flatData.length);
        
        // Look backward to find a task that can be a parent
        for (let i = currentIndex - 1; i >= 0; i--) {
          const candidateParent = ganttRef.current.flatData[i] as any;
          console.log(`Checking candidate parent at index ${i}:`, {
            TaskID: candidateParent.TaskID,
            TaskName: candidateParent.TaskName,
            level: candidateParent.level
          });
          
          // The parent should be at a level that can logically contain this task
          // When indenting, we want the task above us (or a suitable ancestor)
          if (candidateParent.level <= taskData.level) {
            parentId = findOriginalTaskId(candidateParent.TaskID, ganttData);
            console.log('Selected parent:', { TaskID: candidateParent.TaskID, originalId: parentId });
            break;
          }
        }
      }
      
      console.log('Final parent_id for indentation:', parentId);
      
      updateTask.mutate({ id: originalTaskId, parent_id: parentId }, {
        onSuccess: () => {
          console.log('Indent mutation succeeded');
          toast({ title: "Success", description: "Task indented successfully" });
        },
        onError: (error) => {
          console.error('Indent mutation failed:', error);
          toast({ variant: "destructive", title: "Error", description: `Failed to indent: ${error.message}` });
        }
      });
    }
    else if (args.requestType === 'outdented' && args.data) {
      console.log('=== SIMPLE OUTDENT ===');
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (!originalTaskId) return;
      
      updateTask.mutate({ id: originalTaskId, parent_id: null }, {
        onSuccess: () => toast({ title: "Success", description: "Task outdented successfully" }),
        onError: (error) => toast({ variant: "destructive", title: "Error", description: `Failed to outdent: ${error.message}` })
      });
    }
    else {
      console.log('UNHANDLED REQUEST TYPE:', args.requestType);
    }
  };

  const handleContextMenuClick = (args: any) => {
    console.log('Context menu clicked:', args.item.text, args);
  };

  const handleResizeStart = (args: any) => {
    console.log('Resize start:', args);
  };

  const handleResizing = (args: any) => {
    console.log('Resizing:', args);
  };

  const handleResizeStop = (args: any) => {
    console.log('Resize stop:', args);
  };

  const handleColumnMenuOpen = (args: any) => {
    console.log('Column menu opened:', args);
  };

  const handleColumnMenuClick = (args: any) => {
    console.log('Column menu clicked:', args);
  };

  if (isLoading || resourcesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading tasks</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.taskName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmation}
        isLoading={deleteTask.isPending}
      />

      <GanttComponent
        ref={ganttRef}
        id="gantt"
        dataSource={ganttData}
        taskFields={taskFields}
        resourceFields={resourceFields}
        resources={resources}
        editSettings={editSettings}
        columns={columns}
        addDialogFields={[]}
        toolbar={toolbarOptions}
        enableContextMenu={true}
        contextMenuClick={handleContextMenuClick}
        splitterSettings={splitterSettings}
        height="600px"
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        toolbarClick={handleToolbarClick}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        rowSelected={handleRowSelected}
        resizeStart={handleResizeStart}
        resizing={handleResizing}
        resizeStop={handleResizeStop}
        allowSelection={true}
        allowResizing={true}
        showColumnMenu={true}
        columnMenuOpen={handleColumnMenuOpen}
        columnMenuClick={handleColumnMenuClick}
        gridLines="Both"
        timelineSettings={{
          timelineUnitSize: 40,
          topTier: {
            unit: 'Week',
            format: 'MMM dd, \'yy'
          },
          bottomTier: {
            unit: 'Day',
            format: 'dd'
          }
        }}
      >
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu, TreeGridEdit]} />
      </GanttComponent>
    </div>
  );
};
