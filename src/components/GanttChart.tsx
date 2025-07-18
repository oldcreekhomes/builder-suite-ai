import { GanttComponent, Inject, Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Import Syncfusion CSS
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-calendars/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import '@syncfusion/ej2-layouts/styles/material.css';
import '@syncfusion/ej2-grids/styles/material.css';
import '@syncfusion/ej2-treegrid/styles/material.css';
import '@syncfusion/ej2-gantt/styles/material.css';

// Register Syncfusion license immediately
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF5cXmRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWXhfeHVRRmhdUEZ1XEpWYEk=');

interface GanttChartProps {
  projectId: string;
}

function GanttChart({ projectId }: GanttChartProps) {
  // Fetch schedule tasks from the database
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-schedule-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) {
        console.error('Error fetching schedule tasks:', error);
        throw error;
      }

      // Transform database data to Gantt format
      return data.map((task, index) => ({
        TaskID: task.id,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Progress: task.progress || 0,
        Predecessor: task.dependencies?.join(',') || null,
      }));
    },
    enabled: !!projectId,
  });

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
  };

  const labelSettings: any = {
    leftLabel: 'TaskName'
  };

  const splitterSettings = {
    position: "28%"
  };

  // Set dynamic project dates based on tasks or default dates
  const projectStartDate: Date = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.StartDate).getTime())))
    : new Date();
  
  const projectEndDate: Date = tasks.length > 0 
    ? new Date(Math.max(...tasks.map(t => new Date(t.EndDate).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    newRowPosition: 'Bottom' as any
  };

  const toolbar = ['Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll'];

  if (isLoading) {
    return <div style={{ padding: '10px' }}>Loading schedule...</div>;
  }

  return (
    <div style={{ padding: '10px' }}>
      <GanttComponent 
        id='SyncfusionGantt' 
        dataSource={tasks}
        taskFields={taskFields} 
        labelSettings={labelSettings} 
        height='500px'
        projectStartDate={projectStartDate} 
        projectEndDate={projectEndDate}
        editSettings={editSettings}
        toolbar={toolbar}
        splitterSettings={splitterSettings}
        allowSorting={true}
        allowReordering={true}
        allowSelection={true}
      >
        <Inject services={[Selection, Toolbar, Edit, Sort, RowDD, Resize, ColumnMenu]} />
      </GanttComponent>
    </div>
  );
}

export default GanttChart;