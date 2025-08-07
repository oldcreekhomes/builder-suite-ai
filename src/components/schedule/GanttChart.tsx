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
  
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false, 
    taskData: null as any, 
    taskName: ''
  });

  // Transform database tasks to Syncfusion format
  const ganttData = React.useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }
    
    return tasks.map((task) => {
      let resourceNames = null;
      if (task.resources && resources && resources.length > 0) {
        const taskResourceIds = Array.isArray(task.resources) ? task.resources : [task.resources];
        resourceNames = taskResourceIds
          .map(id => {
            const resource = resources.find(r => 
              (r as any).resourceId === id || 
              (r as any).id === id ||
              String((r as any).resourceId) === String(id) ||
              String((r as any).id) === String(id)
            );
            return (resource as any)?.resourceName || (resource as any)?.name || (resource as any)?.displayName;
          })
          .filter(Boolean)
          .join(', ');
      }

      return {
        TaskID: String(task.id),
        TaskName: task.task_name || 'Untitled Task',
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration || 1,
        Progress: task.progress || 0,
        ParentID: task.parent_id ? String(task.parent_id) : null,
        Predecessor: task.predecessor || null,
        Resources: resourceNames || task.resources || null,
        Confirmed: task.confirmed,
        ConfirmationToken: (task as any).confirmation_token || null,
        AssignedUsers: (task as any).assigned_user_ids || null,
      };
    });
  }, [tasks, resources]);

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
        const newTaskData = {
          project_id: projectId,
          task_name: 'New Task',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(),
          duration: 1,
          progress: 0,
          parent_id: null,
          predecessor: null,
          resources: null,
          order_index: tasks ? tasks.length : 0
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

  // Handle actions - prevent dialogs
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

  // Database sync
  const handleActionComplete = (args: any) => {
    if (!args || !args.data) return;
    
    console.log('🎭 Action complete:', args.requestType, args.data);
    
    const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!taskData) return;
    
    const onSuccess = (msg: string) => {
      console.log('✅ Database operation success:', msg);
      toast({ title: "Success", description: msg });
      // Auto-fit columns after any data change
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
          const updateParams = {
            id: String(taskData.TaskID), 
            task_name: taskData.TaskName,
            start_date: taskData.StartDate ? taskData.StartDate.toISOString() : undefined, 
            end_date: taskData.EndDate ? taskData.EndDate.toISOString() : undefined,
            duration: taskData.Duration, 
            progress: taskData.Progress, 
            predecessor: taskData.Predecessor,
            resources: taskData.Resources, 
            confirmed: taskData.Confirmed,
            assigned_user_ids: taskData.AssignedUsers
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
          let finalParentId = taskData.ParentID || null;
          
          if (args.requestType === 'outdented') {
            try {
              if (ganttInstance.current && ganttInstance.current.currentViewData) {
                const currentTask = ganttInstance.current.currentViewData.find((t: any) => t.taskId === taskData.TaskID);
                if (currentTask) {
                  finalParentId = currentTask.parentItem ? currentTask.parentItem.taskId : null;
                }
              }
            } catch (error) {
              console.log('Error getting parent from currentViewData:', error);
            }
          }
          
          const hierarchyParams = {
            id: String(taskData.TaskID), 
            parent_id: finalParentId ? String(finalParentId) : null
          };
          
          if (updateTask) {
            updateTask.mutate(hierarchyParams, { 
              onSuccess: () => onSuccess("Task hierarchy updated"), 
              onError: onError 
            });
          }
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
      deleteTask.mutate(String(deleteConfirmation.taskData.TaskID), {
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

  if (isLoading || resourcesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <div className="ml-4">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <div>
          <h3>Error loading tasks:</h3>
          <p>{error.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="control-pane">
      <div className="control-section">
        <div className="col-lg-12">
          <div className="mb-2 text-sm text-gray-500">
            Tasks in DB: {tasks?.length || 0} | Gantt Data: {ganttData?.length || 0}
          </div>
          
          <DeleteConfirmationDialog
            open={deleteConfirmation.isOpen}
            onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}
            title="Delete Task"
            description={`Are you sure you want to delete "${deleteConfirmation.taskName}"?`}
            onConfirm={handleDeleteConfirmation}
            isLoading={deleteTask && deleteTask.isPending}
          />

          <GanttComponent
            id="EnableWbs" 
            ref={ganttInstance} 
            key={`gantt-${projectId}-${ganttData.length}`}
            dataSource={ganttData} 
            height="550px"
            taskFields={{
              id: "TaskID", 
              name: "TaskName", 
              startDate: "StartDate", 
              endDate: "EndDate",
              duration: "Duration", 
              progress: "Progress", 
              dependency: "Predecessor",
              parentID: 'ParentID', 
              resourceInfo: 'Resources'
            }}
            editSettings={{
              allowAdding: true, 
              allowEditing: true, 
              allowDeleting: true, 
              allowTaskbarEditing: true,
              showDeleteConfirmDialog: false, 
              mode: 'Auto', 
              newRowPosition: 'Bottom'
            }}
            toolbar={[
              "Add", "Edit", "Update", "Delete", "Cancel", "ExpandAll", "CollapseAll",
              { text: 'Publish Schedule', id: 'publish', prefixIcon: 'e-export' }
            ]}
            timelineSettings={{
              showTooltip: true, 
              topTier: { unit: "Week", format: "dd/MM/yyyy" },
              bottomTier: { unit: "Day", count: 1 }
            }}
            selectionSettings={{ mode: "Row", type: "Single", enableToggle: false }}
            splitterSettings={{ columnIndex: 4 }}
            labelSettings={{ taskLabel: '${Progress}%' }}
            tooltipSettings={{ showTooltip: true }}
            filterSettings={{ type: "Menu" }}
            projectStartDate={new Date()}
            projectEndDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            resourceFields={{ id: 'resourceId', name: 'resourceName' }}
            resources={resources}
            treeColumnIndex={2} 
            allowSorting={true} 
            enableContextMenu={true}
            addDialogFields={[]} 
            enableWBS={true} 
            enableAutoWbsUpdate={true}
            allowSelection={true} 
            allowPdfExport={true} 
            highlightWeekends={true}
            allowFiltering={false} 
            gridLines="Both" 
            taskbarHeight={20} 
            rowHeight={40}
            allowResizing={true} 
            allowUnscheduledTasks={true}
            showColumnMenu={true}
            columnMenuItems={['AutoFitAll', 'ColumnChooser']}
            allowReordering={true}
            
            
            // Event handlers
            toolbarClick={handleToolbarClick} 
            actionBegin={handleActionBegin}
            actionComplete={handleActionComplete} 
            queryTaskbarInfo={handleQueryTaskbarInfo}
            dataBound={handleDataBound}
            created={handleCreated}
            load={handleLoad}
           >
            <ColumnsDirective>
              <ColumnDirective 
                field="WBSCode" 
                headerText="ID" 
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="TaskName" 
                headerText="Task Name" 
                allowReordering={false}
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="StartDate" 
                headerText="Start Date"
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="Duration" 
                headerText="Duration"
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="EndDate" 
                headerText="End Date"
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="WBSPredecessor" 
                headerText="Predecessor"
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="Progress" 
                headerText="Progress"
                allowResizing={true}
                allowSorting={false}
              />
              <ColumnDirective 
                field="Resources" 
                headerText="Resources"
                allowResizing={true}
                allowSorting={false}
              />
            </ColumnsDirective>
            
            <EventMarkersDirective>
              <EventMarkerDirective day={new Date()} label='Project Start'></EventMarkerDirective>
            </EventMarkersDirective>
            
            <Inject services={[Selection, DayMarkers, Toolbar, Edit, Filter, Sort, ContextMenu, ColumnMenu, Resize]} />
          </GanttComponent>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;