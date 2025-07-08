import React, { useEffect } from 'react';
import { GanttComponent, Inject, Edit, Selection, Toolbar, DayMarkers, ContextMenu } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';

interface Task {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  progress: number;
  assigned_to?: string;
  color: string;
  duration?: number;
  dependencies?: string[];
}

interface SyncfusionGanttChartProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskAdd?: (task: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function SyncfusionGanttChart({ 
  tasks, 
  onTaskUpdate, 
  onTaskAdd, 
  onTaskDelete 
}: SyncfusionGanttChartProps) {
  
  useEffect(() => {
    // Register Syncfusion license from Supabase secrets
    const fetchLicenseKey = async () => {
      try {
        const response = await fetch('https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/get-syncfusion-key', {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbW53bHZtbWtuZ3JnYXRuemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU3OTgsImV4cCI6MjA2NjE4MTc5OH0.gleBmte9X1uQWYaTxX-dLWVqk6Hpvb_qjseN_aG6xM0'}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.key) {
            registerLicense(data.key);
          }
        }
      } catch (error) {
        console.warn('Could not fetch Syncfusion license key:', error);
      }
    };
    
    fetchLicenseKey();
  }, []);

  // Transform tasks for Syncfusion format
  const syncfusionTasks = tasks.map(task => ({
    TaskID: task.id,
    TaskName: task.task_name,
    StartDate: new Date(task.start_date),
    EndDate: new Date(task.end_date),
    Duration: task.duration || 1,
    Progress: task.progress,
    ResourceNames: task.assigned_to || '',
    Color: task.color
  }));

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    resourceInfo: 'ResourceNames',
    dependency: 'Predecessor'
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true
  };

  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll',
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 'PrevTimeSpan', 'NextTimeSpan'
  ];

  const splitterSettings = {
    columnIndex: 3
  };

  const projectStartDate = new Date(2024, 11, 1);
  const projectEndDate = new Date(2025, 11, 31);

  const labelSettings = {
    leftLabel: 'TaskName',
    rightLabel: 'ResourceNames'
  };

  const timelineSettings = {
    timelineUnitSize: 60,
    topTier: {
      unit: 'Week' as any,
      format: 'MMM dd, y'
    },
    bottomTier: {
      unit: 'Day' as any,
      format: 'd'
    }
  };

  const handleActionBegin = (args: any) => {
    if (args.requestType === 'save') {
      const updatedTask = args.data;
      if (onTaskUpdate) {
        onTaskUpdate(updatedTask.TaskID, {
          task_name: updatedTask.TaskName,
          start_date: updatedTask.StartDate.toISOString().split('T')[0],
          end_date: updatedTask.EndDate.toISOString().split('T')[0],
          progress: updatedTask.Progress,
          assigned_to: updatedTask.ResourceNames,
          duration: updatedTask.Duration
        });
      }
    } else if (args.requestType === 'add') {
      const newTask = args.data;
      if (onTaskAdd) {
        onTaskAdd({
          task_name: newTask.TaskName,
          start_date: newTask.StartDate.toISOString().split('T')[0],
          end_date: newTask.EndDate.toISOString().split('T')[0],
          progress: newTask.Progress || 0,
          assigned_to: newTask.ResourceNames,
          color: '#3b82f6'
        });
      }
    } else if (args.requestType === 'delete') {
      if (onTaskDelete) {
        onTaskDelete(args.data[0].TaskID);
      }
    }
  };

  return (
    <div className="w-full h-[600px] border border-border rounded-lg bg-background p-4">
      <GanttComponent
        id="gantt"
        dataSource={syncfusionTasks}
        taskFields={taskFields}
        editSettings={editSettings}
        toolbar={toolbarOptions}
        splitterSettings={splitterSettings}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        labelSettings={labelSettings}
        timelineSettings={timelineSettings}
        height="100%"
        allowSelection={true}
        allowResizing={true}
        allowSorting={true}
        allowReordering={true}
        showColumnMenu={true}
        highlightWeekends={true}
        actionBegin={handleActionBegin}
        gridLines="Both"
        treeColumnIndex={1}
      >
        <Inject services={[Edit, Selection, Toolbar, DayMarkers, ContextMenu]} />
      </GanttComponent>
    </div>
  );
}