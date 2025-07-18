import { GanttComponent, Inject, Selection } from '@syncfusion/ej2-react-gantt';
import { registerLicense } from '@syncfusion/ej2-base';
import * as React from 'react';
import { projectNewData } from '@/data/ganttData';

// Register Syncfusion license
if (typeof window !== 'undefined') {
  registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY || '');
}

function GanttChart() {
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    child: 'subtasks'
  };

  const labelSettings: any = {
    leftLabel: 'TaskName'
  };

  const projectStartDate: Date = new Date('03/24/2019');
  const projectEndDate: Date = new Date('07/06/2019');

  return (
    <GanttComponent 
      id='SyncfusionGantt' 
      dataSource={projectNewData}
      taskFields={taskFields} 
      labelSettings={labelSettings} 
      height='500px'
      projectStartDate={projectStartDate} 
      projectEndDate={projectEndDate}
    >
      <Inject services={[Selection]} />
    </GanttComponent>
  );
}

export default GanttChart;