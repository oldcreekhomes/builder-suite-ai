import React, { useRef, useMemo, useState, useEffect } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Edit, Selection, Toolbar, DayMarkers, Resize, ColumnMenu, ContextMenu, EditSettingsModel } from '@syncfusion/ej2-react-gantt';
import { Edit as TreeGridEdit } from '@syncfusion/ej2-react-treegrid';
import { supabase } from '@/integrations/supabase/client';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { generateNestedHierarchy, findOriginalTaskId, ProcessedTask, convertResourceIdsToNames } from '@/utils/ganttUtils';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { PublishScheduleDialog } from './PublishScheduleDialog';
import '@/utils/syncfusionOverrides';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule, isLoading: isPublishing } = usePublishSchedule(projectId);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskData: any;
    taskName: string;
  }>({ isOpen: false, taskData: null, taskName: '' });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Set up real-time updates for task confirmations
  useEffect(() => {
    const channel = supabase
      .channel('schedule-task-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_schedule_tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Task confirmation updated via realtime:', payload);
          // Force Gantt component refresh when task confirmations change
          setForceRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 
    { text: 'Publish', id: 'publish', prefixIcon: 'e-export' },
    { text: 'Refresh Colors', id: 'refresh', prefixIcon: 'e-refresh' },
    'Indent', 'Outdent'
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

  // Force refresh when data changes to ensure taskbar colors update
  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      console.log('=== FORCING GANTT REFRESH ===');
      console.log('Tasks with confirmation status:', ganttData.map(t => ({ 
        id: t.TaskID, 
        name: t.TaskName, 
        confirmed: t.Confirmed 
      })));
      
      const timer = setTimeout(() => {
        ganttRef.current?.refresh();
        console.log('Gantt component refreshed to update taskbar colors');
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [ganttData, forceRefreshKey]);

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

  // ENHANCED: Improved parent ID detection function
  const getParentIdForTask = (taskData: any): string | null => {
    console.log('=== ENHANCED PARENT ID DETECTION ===');
    console.log('Task data:', taskData);
    console.log('Task TaskID:', taskData.TaskID);
    
    if (!ganttRef.current) {
      console.log('No gantt reference available');
      return null;
    }
    
    const ganttInstance = ganttRef.current;
    
    // Method 1: Check if task has direct parentItem property
    if (taskData.parentItem && taskData.parentItem.TaskID) {
      const parentOriginalId = findOriginalTaskId(taskData.parentItem.TaskID, ganttData);
      console.log('Method 1 - Parent via parentItem:', parentOriginalId);
      if (parentOriginalId) return parentOriginalId;
    }
    
    // Method 2: Find the task in gantt's current data and check its parent
    try {
      const currentTaskRecord = ganttInstance.currentViewData?.find((task: any) => 
        task.TaskID === taskData.TaskID
      );
      
      if (currentTaskRecord) {
        console.log('Found task in currentViewData:', currentTaskRecord);
        
        // Check parent properties
        if (currentTaskRecord.parentItem && currentTaskRecord.parentItem.taskId) {
          const parentOriginalId = findOriginalTaskId(currentTaskRecord.parentItem.taskId, ganttData);
          console.log('Method 2a - Parent via currentViewData parentItem:', parentOriginalId);
          if (parentOriginalId) return parentOriginalId;
        }
        
        // Check for parent task ID property
        if ((currentTaskRecord as any).ParentID) {
          const parentOriginalId = findOriginalTaskId((currentTaskRecord as any).ParentID, ganttData);
          console.log('Method 2b - Parent via ParentID property:', parentOriginalId);
          if (parentOriginalId) return parentOriginalId;
        }
      }
    } catch (error) {
      console.log('Method 2 failed:', error);
    }
    
    // Method 3: Use flatData to find parent relationship
    try {
      const flatDataTask = ganttInstance.flatData?.find((task: any) => 
        task.TaskID === taskData.TaskID
      );
      
      if (flatDataTask) {
        console.log('Found task in flatData:', flatDataTask);
        
        if (flatDataTask.parentItem && flatDataTask.parentItem.taskId) {
          const parentOriginalId = findOriginalTaskId(flatDataTask.parentItem.taskId, ganttData);
          console.log('Method 3 - Parent via flatData:', parentOriginalId);
          if (parentOriginalId) return parentOriginalId;
        }
      }
    } catch (error) {
      console.log('Method 3 failed:', error);
    }
    
    // Method 4: Parse TaskID hierarchical pattern (e.g., "1.1" -> parent is "1")
    if (taskData.TaskID && typeof taskData.TaskID === 'string') {
      const taskIdParts = taskData.TaskID.split('.');
      console.log('TaskID parts:', taskIdParts);
      
      if (taskIdParts.length > 1) {
        // Get parent TaskID by removing last part
        const parentTaskId = taskIdParts.slice(0, -1).join('.');
        console.log('Calculated parent TaskID from hierarchy:', parentTaskId);
        
        const parentOriginalId = findOriginalTaskId(parentTaskId, ganttData);
        console.log('Method 4 - Parent via TaskID hierarchy:', parentOriginalId);
        if (parentOriginalId) return parentOriginalId;
      }
    }
    
    // Method 5: Use selected task as parent (fallback)
    if (selectedTaskId) {
      console.log('Method 5 - Using selected task as parent:', selectedTaskId);
      return selectedTaskId;
    }
    
    console.log('No parent found - will be root level task');
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

  // Handle taskbar styling based on confirmation status
  const handleQueryTaskbarInfo = (args: any) => {
    console.log('=== TASKBAR INFO QUERY ===');
    console.log('Task data:', args.data);
    console.log('TaskID:', args.data?.TaskID);
    
    // Check multiple possible locations for the Confirmed field
    let confirmed = args.data?.taskData?.confirmed || 
                   args.data?.taskData?.Confirmed || 
                   args.data?.confirmed || 
                   args.data?.Confirmed;
    
    // If not found in direct data, look up by TaskID in ganttData
    if (typeof confirmed === 'undefined' || confirmed === null) {
      const taskId = args.data?.TaskID;
      if (taskId && ganttData) {
        const task = ganttData.find(t => t.TaskID === taskId);
        confirmed = task?.Confirmed;
        console.log('Found via TaskID lookup:', confirmed);
      }
    }
    
    console.log('Final confirmed value:', confirmed, 'type:', typeof confirmed);
    
    // Handle boolean and string representations
    if (confirmed === true || confirmed === 'true') {
      console.log('Setting GREEN for confirmed task');
      // Green for confirmed tasks
      args.taskbarBgColor = '#22c55e'; // green-500
      args.taskbarBorderColor = '#16a34a'; // green-600
      args.progressBarBgColor = '#15803d'; // green-700
    } else if (confirmed === false || confirmed === 'false') {
      console.log('Setting RED for denied task');
      // Red for denied tasks
      args.taskbarBgColor = '#ef4444'; // red-500
      args.taskbarBorderColor = '#dc2626'; // red-600
      args.progressBarBgColor = '#b91c1c'; // red-700
    } else {
      console.log('No confirmed status found or pending - using default blue');
      // Default blue for pending tasks
      args.taskbarBgColor = '#3b82f6'; // blue-500
      args.taskbarBorderColor = '#2563eb'; // blue-600
      args.progressBarBgColor = '#1d4ed8'; // blue-700
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
    
    // Check for Publish button
    const isPublishButton = args.item?.id === 'publish' || 
                           args.item?.text === 'Publish';
    
    // Check for manual refresh button
    const isRefreshButton = args.item?.id === 'refresh' || 
                           args.item?.text === 'Refresh Colors';
    
    console.log('Is Add button?', isAddButton);
    console.log('Is ZoomToFit button?', isZoomToFitButton);
    console.log('Is Publish button?', isPublishButton);
    console.log('Is Refresh button?', isRefreshButton);
    
    if (isAddButton) {
      console.log('Add button detected! Preventing default and adding ROOT task...');
      // Prevent the default add dialog from opening
      args.cancel = true;
      
      // FIXED: Clear selection and add as root task
      if (ganttRef.current) {
        console.log('Clearing selection and adding root task...');
        
        // Clear any selection to ensure new task is added as root
        ganttRef.current.clearSelection();
        setSelectedTaskId(null);
        
        // Add record at the bottom with no parent (root level)
        ganttRef.current.addRecord({
          TaskName: 'New Task',
          Duration: 1,
          Progress: 0,
          ParentID: null // Explicitly set no parent
        }, 'Bottom', null); // null as third parameter means no parent
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
    } else if (isPublishButton) {
      console.log('Publish button clicked! Opening dialog...');
      setPublishDialogOpen(true);
      return;
    } else if (isRefreshButton) {
      console.log('Manual refresh button clicked! Forcing taskbar color refresh...');
      setForceRefreshKey(prev => prev + 1);
      if (ganttRef.current) {
        ganttRef.current.refresh();
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
    
    // IMPROVED: Task creation with enhanced parent detection
    if (args.requestType === 'add' && args.data) {
      const taskData = args.data;
      console.log('=== CREATING NEW TASK ===');
      console.log('New task data:', taskData);
      
      // FIXED: Check if this is a toolbar add (should be root) vs child add
      let parentId = null;
      
      // Only look for parent if the task has explicit parent data
      // If ParentID is explicitly null or undefined, treat as root task
      if (taskData.ParentID !== null && taskData.ParentID !== undefined) {
        console.log('Task has ParentID set, looking for parent...');
        parentId = getParentIdForTask(taskData);
        
        // Additional check: if task was added as a child via UI, it should have parent info
        if (!parentId && ganttRef.current) {
          // Use selectedTaskId instead of getSelectedRecords
          if (selectedTaskId) {
            const selectedTask = ganttData.find(task => (task as any).id === selectedTaskId);
           if (selectedTask) {
               parentId = (selectedTask as any).id;
               console.log('Using selected record as parent:', parentId);
             }
           }
         }
      } else {
        console.log('Task has no ParentID - creating as root task');
        parentId = null;
      }
      
      console.log('Final determined parent ID for new task:', parentId);
      
      const createParams = {
        project_id: projectId,
        task_name: taskData.TaskName || 'New Task',
        start_date: taskData.StartDate ? taskData.StartDate.toISOString() : new Date().toISOString(),
        end_date: taskData.EndDate ? taskData.EndDate.toISOString() : new Date(Date.now() + 86400000).toISOString(),
        duration: taskData.Duration || 1,
        progress: taskData.Progress || 0,
        predecessor: taskData.Predecessor || null,
        resources: convertResourceIdsToNames(taskData.Resources, resources) || null,
        parent_id: parentId, // This should now correctly identify the parent or be null for root
        order_index: tasks.length,
      };
      
      console.log('CREATE TASK PARAMS WITH PARENT:', createParams);
      
      createTask.mutate(createParams, {
        onSuccess: (newTask) => {
          console.log('✅ Task created successfully:', newTask);
          handleMutationSuccess('Create');
        },
        onError: (error) => {
          console.error('❌ Task creation failed:', error);
          handleMutationError(error, 'Create');
        }
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
    // IMPROVED: Enhanced indent/outdent handling
    else if (args.requestType === 'indented' && args.data) {
      console.log('=== INDENTING TASK (making it a child) ===');
      console.log('Full args object:', args);
      
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      console.log('Task being indented:', taskData);
      
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      console.log('Original task ID:', originalTaskId);
      
      if (originalTaskId) {
        // CRITICAL: Get parent from the gantt instance's current state
        let parentId: string | null = null;
        
        // Try to get parent from the current gantt data structure
        if (ganttRef.current && ganttRef.current.currentViewData) {
          const currentTask = ganttRef.current.currentViewData.find((t: any) => t.TaskID === taskData.TaskID);
          console.log('Current task in view data:', currentTask);
          
          if (currentTask && currentTask.parentItem) {
            parentId = findOriginalTaskId(currentTask.parentItem.taskId, ganttData);
            console.log('Parent found from current view data:', parentId);
          }
        }
        
        // Fallback to enhanced parent detection
        if (!parentId) {
          parentId = getParentIdForTask(taskData);
          console.log('Parent found from enhanced detection:', parentId);
        }
        
        // Additional safety check: ensure parent exists in database
        if (parentId) {
          const parentExists = tasks.find(t => t.id === parentId);
          if (!parentExists) {
            console.error('Parent task not found in database:', parentId);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Cannot indent task - parent task not found",
            });
            return;
          }
        }
        
        // Ensure we're not setting a task as its own parent
        if (parentId && parentId !== originalTaskId) {
          console.log(`Setting parent_id: ${parentId} for task: ${originalTaskId}`);
          
          updateTask.mutate({
            id: originalTaskId,
            parent_id: parentId,
            order_index: taskData.index || 0,
          }, {
            onSuccess: () => {
              console.log('✅ Indenting successful - parent_id saved to database');
              handleMutationSuccess('Indent');
            },
            onError: (error) => {
              console.error('❌ Indenting failed:', error);
              handleMutationError(error, 'Indent');
            }
          });
        } else {
          console.error('Invalid parent relationship:', { parentId, originalTaskId });
          toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot indent task - invalid parent relationship",
          });
        }
      }
    } 
    else if (args.requestType === 'outdented' && args.data) {
      console.log('=== OUTDENTING TASK (removing parent relationship) ===');
      const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
      const originalTaskId = findOriginalTaskId(taskData.TaskID, ganttData);
      
      if (originalTaskId) {
        // For outdenting, we need to find the new parent level
        let newParentId: string | null = null;
        
        // Try to get the new parent from gantt's current structure
        if (ganttRef.current && ganttRef.current.currentViewData) {
          const currentTask = ganttRef.current.currentViewData.find((t: any) => t.TaskID === taskData.TaskID);
          if (currentTask && currentTask.parentItem) {
            newParentId = findOriginalTaskId(currentTask.parentItem.taskId, ganttData);
          }
        }
        
        console.log(`Outdenting - setting parent_id from current parent to: ${newParentId}`);
        
        updateTask.mutate({
          id: originalTaskId,
          parent_id: newParentId, // This will be null for root-level tasks
          order_index: taskData.index || 0,
        }, {
          onSuccess: () => {
            console.log('✅ Outdenting successful - parent_id updated in database');
            handleMutationSuccess('Outdent');
          },
          onError: (error) => {
            console.error('❌ Outdenting failed:', error);
            handleMutationError(error, 'Outdent');
          }
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
        queryTaskbarInfo={handleQueryTaskbarInfo}
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

      <PublishScheduleDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={(data) => {
          console.log('Publishing schedule with data:', data);
          if (data.daysFromToday) {
            publishSchedule({
              daysFromToday: data.daysFromToday,
              message: data.message
            });
          }
        }}
      />
    </div>
  );
};