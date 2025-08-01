import React, { useRef, useState, useEffect } from 'react';
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
} from "@syncfusion/ej2-react-gantt";
import { supabase } from '@/integrations/supabase/client';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectResources } from '@/hooks/useProjectResources';
import { usePublishSchedule } from '@/hooks/usePublishSchedule';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { PublishScheduleDialog } from './PublishScheduleDialog';

interface GanttChartProps {
  projectId: string;
}

// 🎯 EXACT SYNCFUSION WBS DEMO - CONVERTED TO HOOKS + YOUR 3 FEATURES
export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttInstance = useRef<GanttComponent>(null);
  
  // 🔧 YOUR CUSTOM HOOKS (replacing class componentDidMount)
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule } = usePublishSchedule(projectId);
  
  // 🎯 HOOKS STATE (replacing class this.state)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskData: any;
    taskName: string;
  }>({ isOpen: false, taskData: null, taskName: '' });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [autoWbsEnabled, setAutoWbsEnabled] = useState(true);

  // 🔄 FEATURE 1: Real-time email confirmation updates
  useEffect(() => {
    const channel = supabase
      .channel('schedule-task-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'project_schedule_tasks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('Email confirmation received:', payload);
        // Real-time color updates when users click accept/deny in emails
        if (ganttInstance.current) {
          ganttInstance.current.refresh();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [projectId]);

  // 🎯 EXACT SYNCFUSION DEMO CONFIGURATION
  const taskFields: any = {
    id: "TaskID",
    name: "TaskName",
    startDate: "StartDate",
    endDate: "EndDate",
    duration: "Duration",
    progress: "Progress",
    dependency: "Predecessor",
    parentID: 'ParentID' // Fixed from demo's 'ParentId'
  };

  // 🔧 FEATURE 2: Transform your database tasks with resource mapping
  const ganttData = React.useMemo(() => {
    if (!tasks.length) {
      // Fallback demo data if no database tasks
      return [
        {
          TaskID: 1,
          TaskName: 'Project initiation',
          StartDate: new Date('04/02/2024'),
          EndDate: new Date('04/21/2024'),
          Progress: 0,
          Resources: 'Project Manager',
          Confirmed: null // Pending
        },
        {
          TaskID: 2,
          TaskName: 'Identify site location',
          StartDate: new Date('04/02/2024'),
          Duration: 4,
          Progress: 70,
          ParentID: 1,
          Resources: 'Site Engineer',
          Confirmed: true // Approved via email
        },
        {
          TaskID: 3,
          TaskName: 'Perform soil test',
          StartDate: new Date('04/02/2024'),
          Duration: 4,
          Progress: 50,
          ParentID: 1,
          Resources: 'Soil Test Team',
          Confirmed: false // Denied via email
        },
        {
          TaskID: 4,
          TaskName: 'Soil test approval',
          StartDate: new Date('04/02/2024'),
          Duration: 4,
          Progress: 50,
          ParentID: 1,
          Resources: 'Project Manager',
          Confirmed: null // Pending
        }
      ];
    }

    // Map your database tasks to Syncfusion format with resource names
    return tasks.map((task) => {
      let resourceNames = null;
      if (task.resources && resources?.length) {
        const taskResourceIds = Array.isArray(task.resources) ? task.resources : [task.resources];
        resourceNames = taskResourceIds
          .map(id => resources.find(r => r.resourceId === id)?.resourceName)
          .filter(Boolean)
          .join(', ');
      }

      return {
        TaskID: task.id,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration || 1,
        Progress: task.progress || 0,
        ParentID: task.parent_id,
        Predecessor: task.predecessor,
        Resources: resourceNames || task.resources,
        // 🔧 YOUR EMAIL WORKFLOW DATA
        Confirmed: task.confirmed,
        ConfirmationToken: task.confirmation_token,
        AssignedUsers: task.assigned_user_ids,
      };
    });
  }, [tasks, resources]);

  // 🎯 EXACT SYNCFUSION DEMO SETTINGS
  const eventMarkerDay1: Date = new Date('04/02/2024');
  
  const autoUpdateWBSChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAutoWbsEnabled(e.target.checked);
    if (ganttInstance.current) {
      ganttInstance.current.enableAutoWbsUpdate = e.target.checked;
    }
  };

  const editSettings: any = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: false, // We'll use custom dialog
  };

  // 🔧 ENHANCED TOOLBAR WITH YOUR FEATURES
  const toolbar: any = [
    "Add", "Edit", "Update", "Delete", "Cancel", "ExpandAll", "CollapseAll",
    // Your custom features
    { text: 'Publish Schedule', id: 'publish', prefixIcon: 'e-export' },
    { text: 'Send Confirmations', id: 'send-emails', prefixIcon: 'e-email' }
  ];

  const timelineSettings: any = {
    showTooltip: true,
    topTier: {
      unit: "Week",
      format: "dd/MM/yyyy",
    },
    bottomTier: {
      unit: "Day",
      count: 1,
    },
  };

  const labelSettings: any = {
    taskLabel: '${Progress}%'
  };

  const projectStartDate: Date = new Date("03/31/2024");
  const projectEndDate: Date = new Date("05/30/2024");
  const splitterSettings: any = {
    columnIndex: 4
  };

  // 🎯 SYNCFUSION DEMO'S CUSTOM STYLING (converted to hook)
  const dataBound = (): void => {
    const gantt = (document.getElementsByClassName('e-gantt')[0] as any).ej2_instances[0];
    if (gantt?.element) {
      const spanLabel = gantt.element.getElementsByClassName('e-span-label')[0] as HTMLElement;
      const rightArrow = gantt.element.getElementsByClassName('e-gantt-right-arrow')[0] as HTMLElement;
      if (spanLabel) spanLabel.style.top = '125px';
      if (rightArrow) rightArrow.style.top = '131px';
    }
  };

  const selectionSettings: any = {
    mode: "Row",
    type: "Single",
    enableToggle: false,
  };

  const tooltipSettings: any = {
    showTooltip: true,
  };

  const filterSettings: any = {
    type: "Menu",
  };

  // 🔧 FEATURE 3: Color-coded taskbars based on email confirmations
  const handleQueryTaskbarInfo = (args: any) => {
    const confirmed = args.data?.Confirmed;
    
    if (confirmed === true || confirmed === 'true') {
      // Green for email approved
      args.taskbarBgColor = '#22c55e';
      args.taskbarBorderColor = '#16a34a';
      args.progressBarBgColor = '#15803d';
    } else if (confirmed === false || confirmed === 'false') {
      // Red for email denied
      args.taskbarBgColor = '#ef4444';
      args.taskbarBorderColor = '#dc2626';
      args.progressBarBgColor = '#b91c1c';
    } else {
      // Blue for pending email response
      args.taskbarBgColor = '#3b82f6';
      args.taskbarBorderColor = '#2563eb';
      args.progressBarBgColor = '#1d4ed8';
    }
  };

  // 🔧 YOUR CUSTOM TOOLBAR ACTIONS
  const handleToolbarClick = (args: any) => {
    if (args.item?.id === 'publish') {
      setPublishDialogOpen(true);
    } else if (args.item?.id === 'send-emails') {
      const tasksWithAssignments = ganttData.filter(task => task.AssignedUsers?.length > 0);
      if (tasksWithAssignments.length === 0) {
        toast({ 
          variant: "destructive", 
          title: "No Assignments", 
          description: "No tasks have assigned users for confirmation emails." 
        });
        return;
      }
      
      toast({ 
        title: "Sending Confirmations", 
        description: `Sending emails for ${tasksWithAssignments.length} tasks...` 
      });

      // TODO: Implement your email sending logic here
      // sendConfirmationEmails(tasksWithAssignments);
    }
  };

  // Delete confirmation
  const handleActionBegin = (args: any) => {
    if (args.requestType === 'beforeDelete') {
      args.cancel = true;
      const taskData = args.data[0];
      setDeleteConfirmation({
        isOpen: true,
        taskData,
        taskName: taskData.TaskName || 'Unknown Task'
      });
    }
  };

  // Database sync
  const handleActionComplete = (args: any) => {
    const taskData = Array.isArray(args.data) ? args.data[0] : args.data;
    
    switch (args.requestType) {
      case 'add':
        createTask.mutate({
          project_id: projectId,
          task_name: taskData.TaskName || 'New Task',
          start_date: taskData.StartDate?.toISOString() || new Date().toISOString(),
          end_date: taskData.EndDate?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
          duration: taskData.Duration || 1,
          progress: taskData.Progress || 0,
          parent_id: taskData.ParentID || null,
          predecessor: taskData.Predecessor || null,
          resources: taskData.Resources || null,
          order_index: tasks.length
        }, {
          onSuccess: () => toast({ title: "Success", description: "Task created successfully" }),
          onError: (error) => toast({ variant: "destructive", title: "Error", description: error.message })
        });
        break;

      case 'save':
      case 'cellSave':
      case 'taskbarEdited':
        updateTask.mutate({
          id: taskData.TaskID,
          task_name: taskData.TaskName,
          start_date: taskData.StartDate?.toISOString(),
          end_date: taskData.EndDate?.toISOString(),
          duration: taskData.Duration,
          progress: taskData.Progress,
          predecessor: taskData.Predecessor,
          resources: taskData.Resources,
          confirmed: taskData.Confirmed,
          assigned_user_ids: taskData.AssignedUsers
        }, {
          onSuccess: () => toast({ title: "Success", description: "Task updated successfully" }),
          onError: (error) => toast({ variant: "destructive", title: "Error", description: error.message })
        });
        break;

      case 'indented':
      case 'outdented':
        updateTask.mutate({
          id: taskData.TaskID,
          parent_id: taskData.ParentID || null
        }, {
          onSuccess: () => toast({ title: "Success", description: "Task hierarchy updated" }),
          onError: (error) => toast({ variant: "destructive", title: "Error", description: error.message })
        });
        break;
    }
  };

  const handleDeleteConfirmation = () => {
    if (deleteConfirmation.taskData) {
      deleteTask.mutate(deleteConfirmation.taskData.TaskID, {
        onSuccess: () => {
          toast({ title: "Success", description: "Task deleted successfully" });
          setDeleteConfirmation({ isOpen: false, taskData: null, taskName: '' });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
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
        Error loading tasks: {error.message}
      </div>
    );
  }

  return (
    <div className="control-pane">
      <div className="control-section">
        <div className="col-lg-12">
          {/* 🎯 SIMPLE TOGGLE SWITCH (no external dependency) */}
          <div style={{ display: "flex", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label htmlFor="autoUpdateWBS" style={{ fontSize: "15px", marginRight: "8px" }}>
                Auto Update WBS
              </label>
              <input
                type="checkbox"
                id="autoUpdateWBS"
                checked={autoWbsEnabled}
                onChange={autoUpdateWBSChange}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>

          <DeleteConfirmationDialog
            open={deleteConfirmation.isOpen}
            onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}
            title="Delete Task"
            description={`Are you sure you want to delete "${deleteConfirmation.taskName}"?`}
            onConfirm={handleDeleteConfirmation}
            isLoading={deleteTask.isPending}
          />

          <div>
            {/* 🎯 EXACT SYNCFUSION WBS DEMO COMPONENT - WITH YOUR FEATURES */}
            <GanttComponent
              id="EnableWbs"
              taskFields={taskFields}
              ref={ganttInstance}
              toolbar={toolbar}
              treeColumnIndex={2}
              dataSource={ganttData}
              allowSorting={true}
              enableContextMenu={true}
              enableWBS={true}
              dataBound={dataBound}
              enableAutoWbsUpdate={autoWbsEnabled}
              editSettings={editSettings}
              allowSelection={true}
              allowPdfExport={true}
              splitterSettings={splitterSettings}
              selectionSettings={selectionSettings}
              tooltipSettings={tooltipSettings}
              filterSettings={filterSettings}
              timelineSettings={timelineSettings}
              highlightWeekends={true}
              allowFiltering={true}
              gridLines={"Both"}
              labelSettings={labelSettings}
              taskbarHeight={20}
              rowHeight={40}
              height={"550px"}
              allowUnscheduledTasks={true}
              projectStartDate={projectStartDate}
              projectEndDate={projectEndDate}
              // 🔧 YOUR CUSTOM EVENT HANDLERS
              toolbarClick={handleToolbarClick}
              actionBegin={handleActionBegin}
              actionComplete={handleActionComplete}
              queryTaskbarInfo={handleQueryTaskbarInfo}
            >
              {/* 🎯 EXACT SYNCFUSION DEMO COLUMNS */}
              <ColumnsDirective>
                <ColumnDirective field="TaskID" visible={false} />
                <ColumnDirective field="WBSCode" width='150px'/>
                <ColumnDirective field="TaskName" headerText="Task Name" allowReordering={false} width='260px' />
                <ColumnDirective field="StartDate" headerText="Start Date" width='140px'/>
                <ColumnDirective field="WBSPredecessor" headerText="WBS Predecessor" width='190px' />
                <ColumnDirective field="Duration" headerText="Duration" allowEditing={false} width='130px' />
                <ColumnDirective field="Progress" headerText="Progress" />
              </ColumnsDirective>
              
              {/* 🎯 EXACT SYNCFUSION DEMO EVENT MARKER */}
              <EventMarkersDirective>
                <EventMarkerDirective day={eventMarkerDay1} label='Project Initiation'></EventMarkerDirective>
              </EventMarkersDirective>
              
              <Inject services={[Selection, DayMarkers, Toolbar, Edit, Filter, Sort, ContextMenu]} />
            </GanttComponent>
          </div>
        </div>
      </div>

      <PublishScheduleDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={(data) => {
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

export default GanttChart;