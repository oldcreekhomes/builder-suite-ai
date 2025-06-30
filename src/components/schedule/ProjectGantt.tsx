
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GSTC from 'gantt-schedule-timeline-calendar';

interface ProjectGanttProps {
  projectId: string;
}

export const ProjectGantt: React.FC<ProjectGanttProps> = ({ projectId }) => {
  const gstcWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gstcWrapperRef.current) return;

    console.log('Initializing Gantt chart for project:', projectId);

    // Clear any existing content
    gstcWrapperRef.current.innerHTML = '';

    // Sample data for the Gantt chart with correct ID format
    const rows = {
      'gstcid-1': {
        id: 'gstcid-1',
        label: 'Foundation Work'
      },
      'gstcid-2': {
        id: 'gstcid-2',
        label: 'Framing'
      },
      'gstcid-3': {
        id: 'gstcid-3',
        label: 'Electrical'
      },
      'gstcid-4': {
        id: 'gstcid-4',
        label: 'Plumbing'
      }
    };

    const items = {
      'gstcid-item-1': {
        id: 'gstcid-item-1',
        rowId: 'gstcid-1',
        label: 'Foundation Work',
        time: {
          start: new Date().getTime(),
          end: new Date().getTime() + 7 * 24 * 60 * 60 * 1000
        }
      },
      'gstcid-item-2': {
        id: 'gstcid-item-2',
        rowId: 'gstcid-2',
        label: 'Framing',
        time: {
          start: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
          end: new Date().getTime() + 14 * 24 * 60 * 60 * 1000
        }
      },
      'gstcid-item-3': {
        id: 'gstcid-item-3',
        rowId: 'gstcid-3',
        label: 'Electrical',
        time: {
          start: new Date().getTime() + 14 * 24 * 60 * 60 * 1000,
          end: new Date().getTime() + 21 * 24 * 60 * 60 * 1000
        }
      },
      'gstcid-item-4': {
        id: 'gstcid-item-4',
        rowId: 'gstcid-4',
        label: 'Plumbing',
        time: {
          start: new Date().getTime() + 16 * 24 * 60 * 60 * 1000,
          end: new Date().getTime() + 23 * 24 * 60 * 60 * 1000
        }
      }
    };

    const columns = {
      data: {
        id: {
          id: 'id',
          data: 'id',
          width: 60,
          header: {
            content: 'ID'
          }
        },
        label: {
          id: 'label',
          data: 'label',
          width: 200,
          header: {
            content: 'Task'
          }
        }
      }
    };

    const config = {
      licenseKey: 'GPL-My-Project-Is-Open-Source',
      list: {
        rows,
        columns
      },
      chart: {
        items,
        time: {
          zoom: 21,
          period: 'day'
        }
      }
    };

    console.log('Creating Gantt chart with config:', config);

    try {
      const state = GSTC.api.stateFromConfig(config);
      console.log('State created:', state);
      
      const gstc = GSTC({
        element: gstcWrapperRef.current,
        state
      });

      console.log('Gantt chart created successfully:', gstc);

      return () => {
        console.log('Cleaning up Gantt chart');
        if (gstc && typeof gstc.destroy === 'function') {
          gstc.destroy();
        }
      };
    } catch (error) {
      console.error('Error creating Gantt chart:', error);
    }
  }, [projectId]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Schedule</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div 
          ref={gstcWrapperRef}
          style={{ width: '100%', height: '500px' }}
          className="gantt-container border border-gray-200 rounded"
        />
      </CardContent>
    </Card>
  );
};
