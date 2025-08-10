import React, { useRef, useState, useEffect } from 'react';
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
  EventMarkersDirective,
  EventMarkerDirective,
  ColumnMenu,
  Resize,
  RowDD,
} from "@syncfusion/ej2-react-gantt";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { transformTasksForGantt, findOriginalTaskId, convertResourceIdsToNames, calculateNewHierarchyNumber } from '@/utils/ganttUtils';

// Register Syncfusion license key
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cXmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXdecXVcR2BZVkF/XkpWYEk=');

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttInstance = useRef<GanttComponent>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule } = usePublishSchedule(projectId);
  
  console.log('🔍 GanttChart component rendered, tasks count:', tasks?.length || 0);
  
  // State for preserving expanded nodes during operations
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [pendingExpansionRestore, setPendingExpansionRestore] = useState(false);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false, 
    taskData: null as any, 
    taskName: ''
  });

  // Helper function to capture expanded state
  const captureExpandedState = () => {
    if (!ganttInstance.current) return;
    
    try {
      // Use the current data from the Gantt instance
      const flatData = ganttInstance.current.flatData;
      const expandedIds: string[] = [];
      
      if (flatData && Array.isArray(flatData)) {
        flatData.forEach((record: any) => {
          // Check if this record has children and is expanded
          if (record.hasChildRecords && record.expanded) {
            expandedIds.push(String(record.TaskID));
          }
        });
      }
      
      setExpandedTaskIds(expandedIds);
      console.log('📌 Captured expanded state:', expandedIds);
    } catch (error) {
      console.warn('⚠️ Failed to capture expanded state:', error);
    }
  };

  // Helper function to restore expanded state
  const restoreExpandedState = () => {
    if (!ganttInstance.current || expandedTaskIds.length === 0) return;
    
    try {
      setTimeout(() => {
        expandedTaskIds.forEach(taskId => {
          try {
            ganttInstance.current?.expandByID(taskId);
          } catch (error) {
            // Silently ignore individual expansion errors
          }
        });
        console.log('🔄 Restored expanded state for:', expandedTaskIds);
        setPendingExpansionRestore(false);
      }, 100);
    } catch (error) {
      console.warn('⚠️ Failed to restore expanded state:', error);
      setPendingExpansionRestore(false);
    }
  };

  // Transform database tasks to Syncfusion format
  const ganttData = React.useMemo(() => {
    if (!tasks || tasks.length === 0) {
      console.log('📊 No tasks available for Gantt chart');
      return [];
    }
    
    console.log('📊 Processing tasks for Gantt chart:', tasks.length);
    console.log('📊 Raw tasks data:', tasks);
    
    // Use the simplified hierarchy transformation with hierarchy_number
    const transformedTasks = transformTasksForGantt(tasks, resources || []);
    console.log('📊 Transformed tasks for Gantt:', transformedTasks.length, 'tasks');
    console.log('📊 First few transformed tasks:', transformedTasks.slice(0, 5));
    
    // Check if any tasks have valid data
    const validTasks = transformedTasks.filter(task => 
      task.TaskName && task.StartDate && task.EndDate
    );
    console.log('📊 Valid tasks with name and dates:', validTasks.length);
    
    if (validTasks.length === 0) {
      console.error('❌ No valid tasks found! All tasks missing required fields');
      console.log('📊 Sample invalid task:', transformedTasks[0]);
    }
    
    return transformedTasks;
  }, [tasks, resources]);

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

  // Auto-fit columns helper function - multiple approaches
  const autoFitAllColumns = () => {
    if (!ganttInstance.current) return;
    try {
      // Only auto-fit columns without forcing a full refresh to avoid infinite load loops
      ganttInstance.current.autoFitColumns();
      if ((ganttInstance.current as any).treeGrid?.autoFitColumns) {
        (ganttInstance.current as any).treeGrid.autoFitColumns();
      }
      console.log('✅ Auto-fit applied without refresh');
    } catch (error: any) {
      console.log('❌ Auto-fit columns failed:', error.message);
    }
  };

  // Simple CSS injection for hiding markers only - NO color CSS
  useEffect(() => {
    const injectBaseCSS = () => {
      // Remove existing custom styles
      const existingStyle = document.getElementById('gantt-custom-colors');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // Only inject CSS to hide event markers
      const css = `
        /* HIDE ALL EVENT MARKERS (Project Start, etc.) */
        .e-gantt .e-event-markers,
        .e-gantt .e-gantt-chart .e-event-markers,
        .e-gantt-chart-container .e-event-markers {
          display: none !important;
        }
      `;
      
      const style = document.createElement('style');
      style.id = 'gantt-custom-colors';
      style.textContent = css;
      document.head.appendChild(style);
    };

    injectBaseCSS();
    
    return () => {
      const existingStyle = document.getElementById('gantt-custom-colors');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [])

  // Color-coded taskbars using native Syncfusion event
  const handleQueryTaskbarInfo = (args: any) => {
    if (!args?.data) return;
    
    // Access the confirmed value from taskData where it's actually stored
    const confirmed = args.data.taskData?.Confirmed;
    let bgColor, borderColor, progressColor;
    
    // Color logic: Green for confirmed=true, Red for confirmed=false, Blue for pending (null/undefined)
    if (confirmed === true) {
      bgColor = '#22c55e'; // Green for confirmed
      borderColor = '#16a34a'; 
      progressColor = '#15803d';
    } else if (confirmed === false) {
      bgColor = '#ef4444'; // Red for denied
      borderColor = '#dc2626'; 
      progressColor = '#b91c1c';
    } else {
      bgColor = '#3b82f6'; // Blue for pending
      borderColor = '#2563eb'; 
      progressColor = '#1d4ed8';
    }
    
    // Apply colors using native Syncfusion properties
    args.taskbarBgColor = bgColor;
    args.taskbarBorderColor = borderColor;
    args.progressBarBgColor = progressColor;
    args.milestoneColor = bgColor;
  };

  // Handle data changes and auto-fit columns when new data arrives
  const handleDataBound = (args: any) => {
    console.log('📊 Data bound event triggered');
    autoFitAllColumns();
    
    // Restore expanded state if pending
    if (pendingExpansionRestore) {
      restoreExpandedState();
    }
  };

  // Handle when Gantt is fully created/rendered
  const handleCreated = (args: any) => {
    console.log('🎨 Gantt created event triggered');
    autoFitAllColumns();
  };

  // Handle when data is loaded/changed
  const handleLoad = (args: any) => {
    console.log('📂 Gantt load event triggered');
    // Prevent re-entrant auto-fit loops; handled in created/dataBound
  };

  // Handle toolbar clicks
  const handleToolbarClick = (args: any) => {
    if (!args || !args.item) return;
    
    console.log('🔧 Toolbar click:', args.item);
    
    if (args.item.id === 'publish') {
      if (publishSchedule) {
        publishSchedule({ 
          daysFromToday: "7", 
          message: 'Schedule published' 
        });
        toast({ title: "Success", description: "Schedule published successfully" });
      }
    } else if (args.item.id === 'gantt_add' || args.item.text === 'Add') {
      console.log('➕ Add button clicked - preventing default dialog');
      args.cancel = true;
      
      if (createTask) {
        console.log('💾 Creating task via mutation...');
        
        // Generate next hierarchy number for new task
        const newHierarchyNumber = calculateNewHierarchyNumber(0, null, tasks);
        
        const newTaskData = {
          project_id: projectId,
          task_name: 'New Task',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(),
          duration: 1,
          progress: 0,
          predecessor: null,
          resources: null,
          hierarchy_number: newHierarchyNumber
        };
        
        createTask.mutate(newTaskData, {
          onSuccess: (response) => {
            console.log('✅ Task created successfully:', response);
            toast({ title: "Success", description: "Task created successfully" });
            // Auto-fit columns after adding new task
            setTimeout(() => autoFitAllColumns(), 200);
          },
          onError: (error: any) => {
            console.error('❌ Task creation failed:', error);
            toast({ 
              variant: "destructive", 
              title: "Error", 
              description: error?.message || 'Failed to create task'
            });
          }
        });
      }
    }
  };

  // Handle drag and drop with hierarchy number calculation
  const handleRowDrop = async (args: any) => {
    console.log('🎯 ROW DROP - calculating new hierarchy number');
    console.log('🎯 Full args:', args);
    
    if (!args || !args.data || args.data.length === 0) return;
    
    // Capture expanded state before the operation
    captureExpandedState();
    setPendingExpansionRestore(true);
    
    const taskData = args.data[0];
    const taskId = String((taskData as any).TaskID);
    const newParentHierarchy = (taskData as any).ParentTaskID ? String((taskData as any).ParentTaskID) : null;
    const dropIndex = args.dropIndex || 0;
    
    console.log('🔍 Task ID:', taskId);
    console.log('🔍 New Parent Hierarchy:', newParentHierarchy);
    console.log('🔍 Drop Index:', dropIndex);
    
    // Calculate new hierarchy number
    const newHierarchyNumber = calculateNewHierarchyNumber(dropIndex, newParentHierarchy, tasks);
    
    console.log('🔍 Calculated hierarchy_number:', newHierarchyNumber);
    
    // Find original task ID from the hierarchy number
    const originalTaskId = findOriginalTaskId(taskId, tasks);
    
    if (!originalTaskId) {
      console.error('❌ Could not find original task ID for:', taskId);
      setPendingExpansionRestore(false);
      return;
    }
    
    // Use updateTask mutation with new hierarchy number
    const updateParams = {
      id: originalTaskId,
      hierarchy_number: newHierarchyNumber
    };
    
    console.log('🔍 Update params:', updateParams);
    
    if (updateTask) {
      updateTask.mutate(updateParams, {
        onSuccess: () => {
          console.log('✅ Drag operation successful');
          toast({ title: "Success", description: "Task moved successfully" });
        },
        onError: (error: any) => {
          console.error('❌ Drag operation failed:', error);
          toast({ 
            variant: "destructive", 
            title: "Error", 
            description: error?.message || 'Failed to move task'
          });
          // Revert the visual change and reset expansion state
          setPendingExpansionRestore(false);
          queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
        }
      });
    }
  };

  // Simple action handlers
  const handleActionBegin = (args: any) => {
    if (!args) return;
    
    console.log('🎬 Action begin:', args.requestType);
    
    if (args.requestType === 'beforeDelete') {
      args.cancel = true;
      const taskData = args.data && args.data[0] ? args.data[0] : null;
      if (taskData) {
        setDeleteConfirmation({ 
          isOpen: true, 
          taskData: taskData, 
          taskName: taskData.TaskName || 'Unknown Task' 
        });
      }
    } else if (args.requestType === 'beforeOpenAddDialog') {
      console.log('🚫 Blocking add dialog');
      args.cancel = true;
    }
  };

  // Simple action complete - ignore drag operations since they're handled in rowDrop
  const handleActionComplete = (args: any) => {
    if (!args) return;
    
    console.log('🎭 Action complete:', args.requestType);
    
    // Ignore drag operations - handled in rowDrop with direct database calls
    if (args.requestType === 'rowDropped') {
      console.log('🚫 Ignoring rowDropped - handled in rowDrop with direct DB call');
      return;
    }
    
    if (!args.data) return;
    
    const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!taskData) return;
    
    const onSuccess = (msg: string) => {
      console.log('✅ Database operation success:', msg);
      toast({ title: "Success", description: msg });
      setTimeout(() => autoFitAllColumns(), 200);
    };
    
    const onError = (error: any) => {
      console.error('❌ Database operation error:', error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error?.message || 'An error occurred' 
      });
    };

    try {
      switch (args.requestType) {
        case 'save':
        case 'cellSave':
        case 'taskbarEdited': {
          console.log('💾 Updating task via mutation...');
          
          // Find original task ID
          const originalTaskId = findOriginalTaskId(String((taskData as any).TaskID), tasks);
          if (!originalTaskId) {
            console.error('❌ Could not find original task ID');
            return;
          }
          
          const updateParams = {
            id: originalTaskId, 
            task_name: (taskData as any).TaskName,
            start_date: (taskData as any).StartDate ? (taskData as any).StartDate.toISOString() : undefined, 
            end_date: (taskData as any).EndDate ? (taskData as any).EndDate.toISOString() : undefined,
            duration: (taskData as any).Duration, 
            progress: (taskData as any).Progress, 
            predecessor: (taskData as any).Predecessor,
            resources: (taskData as any).Resources
          };
          
          if (updateTask) {
            updateTask.mutate(updateParams, { 
              onSuccess: () => onSuccess("Task updated successfully"), 
              onError: onError 
            });
          }
          break;
        }
        
        case 'indented':
        case 'outdented': {
          console.log(`📂 ${args.requestType} operation...`);
          
          // Capture expanded state before hierarchy changes
          captureExpandedState();
          setPendingExpansionRestore(true);
          
          // Find original task ID
          const originalTaskId = findOriginalTaskId(String((taskData as any).TaskID), tasks);
          if (!originalTaskId) {
            console.error('❌ Could not find original task ID');
            setPendingExpansionRestore(false);
            return;
          }
          
          // Calculate new hierarchy number based on the parent
          const newParentHierarchy = (taskData as any).ParentTaskID ? String((taskData as any).ParentTaskID) : null;
          const newHierarchyNumber = calculateNewHierarchyNumber(0, newParentHierarchy, tasks);
          
          const hierarchyParams = {
            id: originalTaskId, 
            hierarchy_number: newHierarchyNumber
          };
          
          if (updateTask) {
            updateTask.mutate(hierarchyParams, { 
              onSuccess: () => onSuccess("Task hierarchy updated"), 
              onError: (error) => {
                setPendingExpansionRestore(false);
                onError(error);
              }
            });
          }
          break;
        }

        default: {
          console.log('❓ Unhandled action type:', args.requestType);
          break;
        }
      }
    } catch (error) {
      console.error('Action complete error:', error);
      onError(error);
    }
  };

  const handleDeleteConfirmation = () => {
    if (deleteConfirmation.taskData && deleteTask) {
      // Find original task ID
      const originalTaskId = findOriginalTaskId(String(deleteConfirmation.taskData.TaskID), tasks);
      if (!originalTaskId) {
        console.error('❌ Could not find original task ID for deletion');
        setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
        return;
      }
      
      deleteTask.mutate(originalTaskId, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task deleted successfully" });
          setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
          // Auto-fit columns after deletion
          setTimeout(() => autoFitAllColumns(), 200);
        },
        onError: (error: any) => {
          toast({ 
            variant: "destructive", 
            title: "Error", 
            description: error?.message || 'Delete failed'
          });
          setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
        }
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error loading tasks</div>;
  }

  console.log('🎯 About to render GanttComponent with:', {
    ganttDataLength: ganttData.length,
    taskFields,
    resourcesLength: resources?.length || 0,
    isLoading,
    error
  });

  return (
    <div className="w-full h-[600px]">
      <GanttComponent
        ref={ganttInstance}
        dataSource={ganttData}
        taskFields={taskFields}
        resourceFields={{ 
          id: 'resourceId', 
          name: 'resourceName' 
        }}
        resources={resources}
        height="600px"
        toolbar={[
          'Add', 'Edit', 'Delete', 'Update', 'Cancel', 'ExpandAll', 'CollapseAll',
          { text: 'Publish Schedule', id: 'publish', prefixIcon: 'e-icons e-schedule' }
        ]}
        editSettings={{
          allowAdding: true,
          allowEditing: true,
          allowDeleting: true,
          allowTaskbarEditing: true,
          showDeleteConfirmDialog: false,
        }}
        allowSelection={true}
        allowRowDragAndDrop={true}
        gridLines="Both"
        treeColumnIndex={1}
        projectStartDate={new Date('2024-01-01')}
        projectEndDate={new Date('2025-12-31')}
        timelineSettings={{
          topTier: { unit: 'Month', format: 'MMM yyyy' },
          bottomTier: { unit: 'Day', format: 'd' },
        }}
        splitterSettings={{ position: "300px" }}
        toolbarClick={handleToolbarClick}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        rowDrop={handleRowDrop}
        queryTaskbarInfo={handleQueryTaskbarInfo}
        dataBound={handleDataBound}
        created={handleCreated}
        load={handleLoad}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" headerText="ID" width="80" />
          <ColumnDirective field="TaskName" headerText="Task Name" width="250" />
          <ColumnDirective field="StartDate" headerText="Start Date" width="120" />
          <ColumnDirective field="EndDate" headerText="End Date" width="120" />
          <ColumnDirective field="Duration" headerText="Duration" width="100" />
          <ColumnDirective field="Progress" headerText="Progress" width="100" />
          <ColumnDirective field="Resources" headerText="Resources" width="150" />
          <ColumnDirective field="Predecessor" headerText="Dependencies" width="120" />
        </ColumnsDirective>
        <Inject services={[Toolbar, Edit, Selection, Filter, Sort, ContextMenu, ColumnMenu, Resize, RowDD, DayMarkers]} />
      </GanttComponent>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => setDeleteConfirmation({ isOpen: open, taskData: null, taskName: '' })}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.taskName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmation}
      />
    </div>
  );
};