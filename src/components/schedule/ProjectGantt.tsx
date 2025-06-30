
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GSTCWrapper from 'gantt-schedule-timeline-calendar';

interface ProjectGanttProps {
  projectId: string;
}

export const ProjectGantt: React.FC<ProjectGanttProps> = ({ projectId }) => {
  const gstcWrapperRef = useRef<any>(null);

  useEffect(() => {
    if (!gstcWrapperRef.current) return;

    // Sample data for the Gantt chart
    const config = {
      licenseKey: 'GPL-My-Project-Is-Open-Source',
      list: {
        rows: {
          '1': {
            id: '1',
            label: 'Foundation Work'
          },
          '2': {
            id: '2',
            label: 'Framing'
          },
          '3': {
            id: '3',
            label: 'Electrical'
          },
          '4': {
            id: '4',
            label: 'Plumbing'
          }
        },
        columns: {
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
        }
      },
      chart: {
        time: {
          zoom: 21
        },
        items: {
          '1': {
            id: '1',
            rowId: '1',
            label: 'Foundation Work',
            time: {
              start: new Date().getTime(),
              end: new Date().getTime() + 7 * 24 * 60 * 60 * 1000
            }
          },
          '2': {
            id: '2',
            rowId: '2',
            label: 'Framing',
            time: {
              start: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
              end: new Date().getTime() + 14 * 24 * 60 * 60 * 1000
            }
          },
          '3': {
            id: '3',
            rowId: '3',
            label: 'Electrical',
            time: {
              start: new Date().getTime() + 14 * 24 * 60 * 60 * 1000,
              end: new Date().getTime() + 21 * 24 * 60 * 60 * 1000
            }
          },
          '4': {
            id: '4',
            rowId: '4',
            label: 'Plumbing',
            time: {
              start: new Date().getTime() + 16 * 24 * 60 * 60 * 1000,
              end: new Date().getTime() + 23 * 24 * 60 * 60 * 1000
            }
          }
        }
      }
    };

    const gstc = GSTCWrapper(config);
    gstcWrapperRef.current.appendChild(gstc.element);

    return () => {
      if (gstc && gstc.destroy) {
        gstc.destroy();
      }
    };
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
          className="gantt-container"
        />
      </CardContent>
    </Card>
  );
};
