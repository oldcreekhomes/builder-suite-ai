import { useEffect, useRef } from 'react';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Edit, Selection, Toolbar, DayMarkers } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import { Button } from '@/components/ui/button';
import { Plus, FileDown } from 'lucide-react';

// Register Syncfusion license
if (typeof window !== 'undefined') {
  registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY || '');
}

export interface SyncfusionGanttProps {
  tasks: any[];
  dependencies?: any[];
  onCreateTask: (taskData: any) => Promise<void>;
  onUpdateTask: (taskId: string, updates: any) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateLink: (linkData: any) => Promise<void>;
  onDeleteLink: (linkId: string) => void;
  isLoading?: boolean;
}

export function SyncfusionGantt({
  tasks = [],
  dependencies = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateLink,
  onDeleteLink,
  isLoading = false
}: SyncfusionGanttProps) {
  const ganttRef = useRef<GanttComponent>(null);

  // Format data for Syncfusion
  const formattedTasks = tasks.map(task => ({
    TaskID: task.id,
    TaskName: task.task_name || 'Untitled Task',
    StartDate: new Date(task.start_date),
    EndDate: new Date(task.end_date),
    Duration: task.duration || 1,
    Progress: task.progress || 0,
    ParentID: task.parent_id || null,
    Color: task.color || '#3b82f6',
    Priority: task.priority || 'medium',
    Notes: task.notes || '',
    AssignedTo: task.assigned_to || null
  }));

  const formattedDependencies = dependencies.map(dep => ({
    From: dep.source_task_id,
    To: dep.target_task_id,
    Type: dep.dependency_type === 'start_to_start' ? 'SS' :
          dep.dependency_type === 'finish_to_finish' ? 'FF' :
          dep.dependency_type === 'start_to_finish' ? 'SF' : 'FS'
  }));

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    parentID: 'ParentID',
    dependency: 'Predecessor'
  };

  const toolbarOptions = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll', 'ZoomIn', 'ZoomOut', 'ZoomToFit'];

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true
  };

  const splitterSettings = {
    position: "28%"
  };

  const projectStartDate = new Date();
  const projectEndDate = new Date();
  projectEndDate.setMonth(projectEndDate.getMonth() + 6);

  const handleActionComplete = (args: any) => {
    if (args.requestType === 'save' && args.action === 'add') {
      // New task added
      const taskData = {
        task_name: args.data.TaskName || 'New Task',
        start_date: args.data.StartDate.toISOString(),
        end_date: args.data.EndDate.toISOString(),
        duration: args.data.Duration || 1,
        progress: args.data.Progress || 0,
        parent_id: args.data.ParentID || null,
        priority: 'medium',
        task_type: 'task'
      };
      onCreateTask(taskData).catch(console.error);
    } else if (args.requestType === 'save' && args.action === 'edit') {
      // Task updated
      const updates = {
        task_name: args.data.TaskName,
        start_date: args.data.StartDate.toISOString(),
        end_date: args.data.EndDate.toISOString(),
        duration: args.data.Duration,
        progress: args.data.Progress || 0,
        parent_id: args.data.ParentID || null
      };
      onUpdateTask(args.data.TaskID, updates);
    } else if (args.requestType === 'delete') {
      // Task deleted
      if (args.data && args.data.length > 0) {
        args.data.forEach((task: any) => {
          onDeleteTask(task.TaskID);
        });
      }
    }
  };

  const handleAddTask = () => {
    const newTask = {
      task_name: 'New Task',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 24*60*60*1000).toISOString(),
      duration: 1,
      progress: 0,
      parent_id: null,
      priority: 'medium',
      task_type: 'task'
    };
    onCreateTask(newTask);
  };

  if (isLoading) {
    return (
      <div className="gantt-loading">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading Gantt Chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper">
      <div className="gantt-toolbar mb-4 p-3 bg-muted rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Professional Syncfusion Gantt Chart - {tasks.length} tasks, {dependencies.length} dependencies
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddTask}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
            <Button 
              onClick={() => ganttRef.current?.pdfExport()}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/90 transition-colors"
            >
              <FileDown className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div 
        style={{ 
          height: 'calc(100vh - 250px)', 
          minHeight: '400px',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}
      >
        <GanttComponent
          ref={ganttRef}
          id="syncfusion-gantt"
          dataSource={formattedTasks}
          taskFields={taskFields}
          editSettings={editSettings}
          toolbar={toolbarOptions}
          splitterSettings={splitterSettings}
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          height="100%"
          actionComplete={handleActionComplete}
          allowPdfExport={true}
          allowExcelExport={true}
        >
          <ColumnsDirective>
            <ColumnDirective field='TaskID' visible={false} />
            <ColumnDirective field='TaskName' headerText='Task Name' width='250' />
            <ColumnDirective field='StartDate' headerText='Start Date' width='150' />
            <ColumnDirective field='EndDate' headerText='End Date' width='150' />
            <ColumnDirective field='Duration' headerText='Duration' width='100' />
            <ColumnDirective field='Progress' headerText='Progress' width='100' />
            <ColumnDirective field='Priority' headerText='Priority' width='100' />
          </ColumnsDirective>
          <Inject services={[Edit, Selection, Toolbar, DayMarkers]} />
        </GanttComponent>
      </div>
    </div>
  );
}