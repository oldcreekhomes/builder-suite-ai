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
    
    // Log parent-child relationships in raw data
    const parentChildMap = new Map();
    tasks.forEach(task => {
      if (task.parent_id) {
        if (!parentChildMap.has(task.parent_id)) {
          parentChildMap.set(task.parent_id, []);
        }
        parentChildMap.get(task.parent_id).push(task.id);
      }
    });
    console.log('Parent-child relationships in database:', Object.fromEntries(parentChildMap));
    
    const transformedData = generateNestedHierarchy(tasks, resources);
    console.log('Transformed hierarchical data:', transformedData);
    console.log('=== GANTT DATA TRANSFORMATION END ===');
    
    return transformedData;
  }, [tasks, resources]);

  // FIXED: Added parentID mapping
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    resourceInfo: 'Resources',
    parentID: 'ParentID', // CRITICAL: Added this line for parent-child relationships
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

  // FIXED: Complete replacement of handleActionComplete function
  const handleActionComplete = (args: any) => {
    console.log('=== ACTION COMPLETE FIXED VERSION ===');
    console.log('Request type:', args.requestType);
    console.log('Action data:', args.data);
    
    // CRITICAL: Cancel/prevent any default Syncfusion notification behavior
    if (args.requestType === 'delete' || args.requestType === 'save' || args.requestType === 'add') {
      args.cancel = true;
      if (args.preventDefault) args.preventDefault();
      if (args.stopPropagation) args.stopPropagation();
    }
    
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
    
    // *** FIXED: Enhanced parent ID detection ***
    const getParentIdForTask = (taskData: any): string | null => {
      console.log('=== GETTING PARENT ID FOR TASK ===');
      console.log('Task data:', taskData);
      
      if (!ganttRef.current) return null;
      
      const ganttInstance = ganttRef.current;
      
      // Method 1: Use parentItem from task data
      if (taskData.parentItem && taskData.parentItem.TaskID) {
        const parentOriginalId = findOriginalTaskId(taskData.parentItem.TaskID, ganttData);
        console.log('Parent found via parentItem:', parentOriginalId);
        return parentOriginalId;
      }
      
      // Method 2: Find task in flatData and get parent
      const currentTask = ganttInstance.flatData?.find((task: any) => 
        task.TaskID === taskData.TaskID
      );
      
      if (currentTask && (currentTask as any).parentItem) {
        const parentTaskId = ((currentTask as any).parentItem as any)?.TaskID;
        if (parentTaskId) {
          const parentOriginalId = findOriginalTaskId(parentTaskId, ganttData);
          console.log('Parent found via flatData:', parentOriginalId);
          return parentOriginalId;
        }
      }
      
      // Method 3: Check for hierarchical TaskID pattern
      if (taskData.TaskID && typeof taskData.TaskID === 'string' && taskData.TaskID.includes('.')) {
        const parentId = findParentFromHierarchy(taskData.TaskID, ganttData);
        console.log('Parent found via TaskID hierarchy:', parentId);
        return parentId;
      }
      
      console.log('No parent found - root level task');
      return null;
    };
    
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      console.log('=== CREATING NEW TASK ===');
      
      // FIXED: Get parent ID using enhanced method
      const parentId = getParentIdForTask(taskData);
      console.log('Determined parent ID for new task:', parentId);
      
      const createParams = {
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate ? taskData.StartDate.toISOString() : new Date().toISOString(),
        end_date: taskData.EndDate ? taskData.EndDate.toISOString() : new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        resources: convertResourceIdsToNames(taskData.Resources, resources) || null,
        parent_id: parentId, // FIXED: Use enhanced parent detection
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
      console.log('UPDATING TASK (save/cellSave):', taskData, 'Original ID:', originalTaskId);
      
      if (originalTaskId) {
        const updateParams = {
          id: originalTaskId,
          task_name: taskData.TaskName,
          start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined,
          end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
          duration: taskData.Duration,
          progress: taskData.Progress,
          predecessor: taskData.Predecessor || null,
          resources: convertResourceIdsToNames(taskData.Resources, resources),
          order_index: taskData.OrderIndex,
        };
        
        console.log('UPDATE TASK PARAMS:', updateParams);
        updateTask.mutate(updateParams, {
          onSuccess: () => handleMutationSuccess('Update'),
          onError: (error) => handleMutationError(error, 'Update')
        });
      }
    }
    else if (args.requestType === 'taskbarEdited' && args.data) {
      console.log('TASKBAR EDITED:', args.data);
      const taskData = args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        const updateParams = {
          id: originalTaskId,
          start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined,
          end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
          duration: taskData.Duration,
          progress: taskData.Progress,
        };
        
        console.log('TASKBAR UPDATE PARAMS:', updateParams);
        updateTask.mutate(updateParams, {
          onSuccess: () => handleMutationSuccess('Update'),
          onError: (error) => handleMutationError(error, 'Update')
        });
      }
    }
    // *** FIXED: Corrected indent/outdent handling ***
    else if (args.requestType === 'indented' && args.data) {
      console.log('=== INDENTING TASK (making it a child) ===');
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        // FIXED: Get parent ID using enhanced method
        const parentId = getParentIdForTask(taskData);
        console.log('Indenting - setting parent_id to:', parentId);
        
        // CRITICAL FIX: Ensure we're not setting a task as its own parent
        if (parentId && parentId !== originalTaskId) {
          updateTask.mutate({
            id: originalTaskId,
            parent_id: parentId,
            order_index: taskData.OrderIndex || 0,
          }, {
            onSuccess: () => {
              console.log('Indenting successful - parent_id saved to database');
              handleMutationSuccess('Indent');
            },
            onError: (error) => handleMutationError(error, 'Indent')
          });
        } else {
          console.error('Cannot set task as its own parent or parent is null');
          toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot indent task - invalid parent relationship",
          });
        }
      }
    } 
    else if (args.requestType === 'outdented' && args.data) {
      console.log('=== OUTDENTING TASK (making it a parent/root) ===');
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        // FIXED: For outdenting, get the new parent (or null for root)
        const parentId = getParentIdForTask(taskData);
        console.log('Outdenting - setting parent_id to:', parentId);
        
        updateTask.mutate({
          id: originalTaskId,
          parent_id: parentId, // This might be null for root-level tasks
          order_index: taskData.OrderIndex || 0,
        }, {
          onSuccess: () => {
            console.log('Outdenting successful - parent_id updated in database');
            handleMutationSuccess('Outdent');
          },
          onError: (error) => handleMutationError(error, 'Outdent')
        });
      }
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