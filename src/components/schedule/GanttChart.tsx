import React, { useRef, useMemo, useState, useEffect } from 'react';
import { 
  GanttComponent, 
  ColumnsDirective, 
  ColumnDirective,
  Inject, 
  Edit, 
  Selection, 
  Toolbar, 
  ContextMenu,
  EditSettingsModel 
} from '@syncfusion/ej2-react-gantt';
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

// 🎯 THIS IS THE EXACT SYNCFUSION WBS DEMO - CONVERTED FROM CLASSES TO HOOKS
export const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const ganttRef = useRef<GanttComponent>(null);
  
  // 🔧 YOUR CUSTOM HOOKS (vs classes using componentDidMount)
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { resources, isLoading: resourcesLoading } = useProjectResources();
  const { publishSchedule } = usePublishSchedule(projectId);
  
  // 🎯 HOOKS STATE (vs class this.state)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskData: any;
    taskName: string;
  }>({ isOpen: false, taskData: null, taskName: '' });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // 🔄 FEATURE 1: Real-time email confirmation updates (useEffect vs componentDidMount)
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
        if (ganttRef.current) {
          ganttRef.current.refresh();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [projectId]);

  // 🎯 SYNCFUSION WBS DEMO DATA - Enhanced with your features
  const ganttData = useMemo(() => {
    if (!tasks.length) {
      // Fallback to demo data if no tasks
      return [
        {
          TaskID: 1,
          TaskName: 'Project initiation',
          StartDate: new Date('04/02/2019'),
          EndDate: new Date('04/21/2019'),
          subtasks: [
            {
              TaskID: 2,
              TaskName: 'Identify site location',
              StartDate: new Date('04/02/2019'),
              Duration: 4,
              Progress: 70,
              Resources: 'Site Engineer',
              Confirmed: null // Pending confirmation
            },
            {
              TaskID: 3,
              TaskName: 'Perform soil test',
              StartDate: new Date('04/02/2019'),
              Duration: 4,
              Progress: 50,
              Resources: 'Soil Test Team',
              Confirmed: true // Approved
            },
            {
              TaskID: 4,
              TaskName: 'Soil test approval',
              StartDate: new Date('04/02/2019'),
              Duration: 4,
              Progress: 50,
              Resources: 'Project Manager',
              Confirmed: false // Denied
            }
          ]
        },
        {
          TaskID: 5,
          TaskName: 'Project estimation',
          StartDate: new Date('04/02/2019'),
          EndDate: new Date('04/21/2019'),
          subtasks: [
            {
              TaskID: 6,
              TaskName: 'Develop floor plan for estimation',
              StartDate: new Date('04/04/2019'),
              Duration: 3,
              Progress: 85,
              Resources: 'Architect',
              Confirmed: true
            },
            {
              TaskID: 7,
              TaskName: 'List materials',
              StartDate: new Date('04/04/2019'),
              Duration: 3,
              Progress: 80,
              Resources: 'Material Coordinator',
              Confirmed: null
            }
          ]
        }
      ];
    }

    // 🔧 FEATURE 2: Map your database tasks with resource names
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
        Confirmed: task.confirmed, // For email workflow colors
        AssignedUsers: task.assigned_user_ids,
      };
    });
  }, [tasks, resources]);

  // 🎯 EXACT SYNCFUSION WBS DEMO CONFIGURATION
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    parentID: 'ParentID',
    dependency: 'Predecessor', 
    resourceInfo: 'Resources',
    child: 'subtasks',
    wbs: 'WBS' // 🎯 WBS FIELD MAPPING
  };

  const editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    mode: 'Auto' as any,
    showDeleteConfirmDialog: false
  };

  // 🎯 WBS COLUMNS FROM SYNCFUSION DEMO
  const columns = [
    { field: 'WBS', headerText: 'WBS Code', width: 100, allowEditing: false },
    { field: 'TaskName', headerText: 'Task Name', width: 250 },
    { field: 'StartDate', headerText: 'Start Date', width: 140 },
    { field: 'Duration', headerText: 'Duration', width: 100 },
    { field: 'Progress', headerText: 'Progress', width: 100 },
    { field: 'Resources', headerText: 'Resources', width: 180 }
  ];

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 
    'ExpandAll', 'CollapseAll', 'Indent', 'Outdent',
    // 🔧 YOUR CUSTOM FEATURES
    { text: 'Publish Schedule', id: 'publish', prefixIcon: 'e-export' },
    { text: 'Send Confirmations', id: 'send-emails', prefixIcon: 'e-email' }
  ];

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
        });
        break;

      case 'indented':
      case 'outdented':
        updateTask.mutate({
          id: taskData.TaskID,
          parent_id: taskData.ParentID || null
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
    <div className="w-full h-full">
      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.taskName}"?`}
        onConfirm={handleDeleteConfirmation}
        isLoading={deleteTask.isPending}
      />

      {/* 🎯 EXACT SYNCFUSION WBS DEMO - WITH YOUR FEATURES ADDED */}
      <GanttComponent
        ref={ganttRef}
        id="gantt"
        dataSource={ganttData}
        taskFields={taskFields}
        resourceFields={{ id: 'resourceId', name: 'resourceName' }}
        resources={resources}
        editSettings={editSettings}
        toolbar={toolbarOptions}
        enableContextMenu={true}
        allowSelection={true}
        height="600px"
        gridLines="Both"
        // 🎯 WBS FEATURES FROM SYNCFUSION DEMO
        enableWBS={true}
        enableAutoWbsUpdate={true}
        // 🔧 YOUR CUSTOM EVENT HANDLERS
        toolbarClick={handleToolbarClick}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        queryTaskbarInfo={handleQueryTaskbarInfo}
        timelineSettings={{
          topTier: { unit: 'Week', format: 'MMM dd, \'yy' },
          bottomTier: { unit: 'Day', format: 'd' }
        }}
      >
        <ColumnsDirective>
          {columns.map(col => (
            <ColumnDirective key={col.field} {...col} />
          ))}
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, ContextMenu]} />
      </GanttComponent>

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