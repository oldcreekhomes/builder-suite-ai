import React, { useRef, useState, useEffect } from 'react';
import {
  GanttComponent, Inject, Selection, ColumnsDirective, ColumnDirective, Toolbar, DayMarkers, Edit, Filter, Sort, ContextMenu, EventMarkersDirective, EventMarkerDirective,
} from "@syncfusion/ej2-react-gantt";
import { supabase } from '@/integrations/supabase/client';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface GanttChartProps {
  projectId: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttInstance = useRef<GanttComponent>(null);
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule } = usePublishSchedule(projectId);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false, 
    taskData: null, 
    taskName: ''
  });

  // Transform database tasks to Syncfusion format
  const ganttData = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    return tasks.map((task) => {
      let resourceNames = null;
      if (task.resources && resources && resources.length > 0) {
        const taskResourceIds = Array.isArray(task.resources) ? task.resources : [task.resources];
        resourceNames = taskResourceIds
          .map(id => {
            // Search by multiple possible ID fields for compatibility
            const resource = resources.find(r => 
              r.resourceId === id || 
              r.id === id ||
              String(r.resourceId) === String(id) ||
              String(r.id) === String(id)
            );
            // Return multiple possible name fields
            return resource?.resourceName || resource?.name || resource?.displayName;
          })
          .filter(Boolean)
          .join(', ');
      }

      return {
        TaskID: task.id,
        TaskName: task.task_name || 'Untitled Task',
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration || 1,
        Progress: task.progress || 0,
        ParentID: task.parent_id || null,
        Predecessor: task.predecessor || null,
        Resources: resourceNames || task.resources || null,
        Confirmed: task.confirmed || null,
        ConfirmationToken: task.confirmation_token || null,
        AssignedUsers: task.assigned_user_ids || null,
      };
    });
  }, [tasks, resources]);

  // PROPER AUTO-FIT - Use Syncfusion's built-in method (excluding ID column)
  useEffect(() => {
    if (ganttInstance.current && ganttData && ganttData.length > 0) {
      const timer = setTimeout(() => {
        if (ganttInstance.current) {
          // Auto-fit all columns EXCEPT the ID column (which has fixed width)
          ganttInstance.current.autoFitColumns(['TaskName', 'StartDate', 'Duration', 'EndDate', 'WBSPredecessor', 'Progress', 'Resources']);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [ganttData]);

  // Real-time email confirmation updates
  useEffect(() => {
    const channel = supabase
      .channel('schedule-task-updates')
      .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public', 
        table: 'project_schedule_tasks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('Real-time update received:', payload);
        if (ganttInstance.current) {
          ganttInstance.current.refresh();
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Color-coded taskbars based on email confirmations
  const handleQueryTaskbarInfo = (args) => {
    if (!args || !args.data) return;
    
    const confirmed = args.data.Confirmed;
    if (confirmed === true || confirmed === 'true') {
      // Green for approved
      args.taskbarBgColor = '#22c55e'; 
      args.taskbarBorderColor = '#16a34a'; 
      args.progressBarBgColor = '#15803d';
    } else if (confirmed === false || confirmed === 'false') {
      // Red for denied
      args.taskbarBgColor = '#ef4444'; 
      args.taskbarBorderColor = '#dc2626'; 
      args.progressBarBgColor = '#b91c1c';
    } else {
      // Blue for pending
      args.taskbarBgColor = '#3b82f6'; 
      args.taskbarBorderColor = '#2563eb'; 
      args.progressBarBgColor = '#1d4ed8';
    }
  };

  // Handle toolbar clicks - NO DIALOG POPUP
  const handleToolbarClick = (args) => {
    if (!args || !args.item) return;
    
    if (args.item.id === 'publish') {
      // Simple publish without dialog
      if (publishSchedule) {
        publishSchedule({ 
          daysFromToday: 7, 
          message: 'Schedule published' 
        });
        toast({ title: "Success", description: "Schedule published successfully" });
      }
    } else if (args.item.id === 'gantt_add' || args.item.text === 'Add') {
      // Prevent default dialog
      args.cancel = true;
      // Add new row directly
      if (ganttInstance.current) {
        ganttInstance.current.addRecord({
          TaskName: 'New Task', 
          StartDate: new Date(), 
          Duration: 1, 
          Progress: 0
        }, 'Bottom');
      }
    }
  };

  // Handle actions - PREVENT DIALOGS
  const handleActionBegin = (args) => {
    if (!args) return;
    
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
      // Block any add dialogs
      args.cancel = true;
    }
  };

  // Database sync
  const handleActionComplete = (args) => {
    if (!args || !args.data) return;
    
    const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
    if (!taskData) return;
    
    const onSuccess = (msg) => {
      toast({ title: "Success", description: msg });
    };
    
    const onError = (error) => {
      console.error('Database error:', error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error?.message || 'An error occurred' 
      });
    };

    try {
      switch (args.requestType) {
        case 'add': {
          const createParams = {
            project_id: projectId, 
            task_name: taskData.TaskName || 'New Task',
            start_date: taskData.StartDate ? taskData.StartDate.toISOString() : new Date().toISOString(),
            end_date: taskData.EndDate ? taskData.EndDate.toISOString() : new Date(Date.now() + 86400000).toISOString(),
            duration: taskData.Duration || 1, 
            progress: taskData.Progress || 0,
            parent_id: taskData.ParentID || null, 
            predecessor: taskData.Predecessor || null,
            resources: taskData.Resources || null, 
            order_index: tasks ? tasks.length : 0
          };
          
          if (createTask) {
            createTask.mutate(createParams, { 
              onSuccess: () => onSuccess("Task created successfully"), 
              onError: onError 
            });
          }
          break;
        }
        
        case 'save':
        case 'cellSave':
        case 'taskbarEdited': {
          const updateParams = {
            id: taskData.TaskID, 
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
          console.log(`=== ${args.requestType.toUpperCase()} DEBUG ===`);
          console.log('TaskData:', taskData);
          console.log('TaskID:', taskData.TaskID);
          console.log('ParentID from event:', taskData.ParentID);
          
          // For outdent, we need to be more careful about the parent detection
          let finalParentId = taskData.ParentID || null;
          
          // Additional check for outdented tasks
          if (args.requestType === 'outdented') {
            console.log('Outdent detected - checking gantt current view data');
            try {
              if (ganttInstance.current && ganttInstance.current.currentViewData) {
                const currentTask = ganttInstance.current.currentViewData.find((t) => t.TaskID === taskData.TaskID);
                console.log('Current task in view:', currentTask);
                
                if (currentTask) {
                  finalParentId = currentTask.parentItem ? currentTask.parentItem.taskId : null;
                  console.log('Parent from currentViewData:', finalParentId);
                }
              }
            } catch (error) {
              console.log('Error getting parent from currentViewData:', error);
            }
          }
          
          console.log('Final parent ID to save:', finalParentId);
          
          const hierarchyParams = {
            id: taskData.TaskID, 
            parent_id: finalParentId
          };
          
          if (updateTask) {
            updateTask.mutate(hierarchyParams, { 
              onSuccess: () => {
                console.log(`✅ ${args.requestType} successful`);
                onSuccess("Task hierarchy updated");
              }, 
              onError: (error) => {
                console.error(`❌ ${args.requestType} failed:`, error);
                onError(error);
              }
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
      deleteTask.mutate(deleteConfirmation.taskData.TaskID, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task deleted successfully" });
          setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
        },
        onError: (error) => {
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        Error loading tasks: {error.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="control-pane">
      <div className="control-section">
        <div className="col-lg-12">
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
            allowColumnReorder={false}
            allowUnscheduledTasks={true}
            toolbarClick={handleToolbarClick} 
            actionBegin={handleActionBegin}
            actionComplete={handleActionComplete} 
            queryTaskbarInfo={handleQueryTaskbarInfo}
          >
            <ColumnsDirective>
              <ColumnDirective field="TaskID" visible={false} />
              <ColumnDirective field="WBSCode" headerText="ID" width={50} />
              <ColumnDirective field="TaskName" headerText="Task Name" allowReordering={false} />
              <ColumnDirective field="StartDate" headerText="Start Date" />
              <ColumnDirective field="Duration" headerText="Duration" />
              <ColumnDirective field="EndDate" headerText="End Date" />
              <ColumnDirective field="WBSPredecessor" headerText="Predecessor" />
              <ColumnDirective field="Progress" headerText="Progress" />
              <ColumnDirective field="Resources" headerText="Resources" />
            </ColumnsDirective>
            
            <EventMarkersDirective>
              <EventMarkerDirective day={new Date()} label='Project Start'></EventMarkerDirective>
            </EventMarkersDirective>
            
            <Inject services={[Selection, DayMarkers, Toolbar, Edit, Filter, Sort, ContextMenu]} />
          </GanttComponent>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;