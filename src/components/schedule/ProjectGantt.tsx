
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProjectGanttProps {
  projectId: string;
}

interface TaskData {
  name: string;
  start: number;
  duration: number;
  startDate: string;
  endDate: string;
}

export const ProjectGantt: React.FC<ProjectGanttProps> = ({ projectId }) => {
  console.log('Rendering Gantt chart for project:', projectId);

  // Sample data with dates and durations
  const tasks: TaskData[] = [
    {
      name: 'Foundation Work',
      start: 0,
      duration: 7,
      startDate: new Date().toLocaleDateString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      name: 'Framing',
      start: 7,
      duration: 7,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      name: 'Electrical',
      start: 14,
      duration: 7,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      name: 'Plumbing',
      start: 16,
      duration: 7,
      startDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toLocaleDateString()
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">Start: {data.startDate}</p>
          <p className="text-sm text-gray-600">End: {data.endDate}</p>
          <p className="text-sm text-gray-600">Duration: {data.duration} days</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Schedule</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tasks}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 30]}
                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="duration" 
                fill="#3b82f6" 
                stackId="timeline"
              />
              <Bar 
                dataKey="start" 
                fill="transparent" 
                stackId="timeline"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-3">Task List</h4>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{task.name}</span>
                <div className="text-sm text-gray-600">
                  {task.startDate} - {task.endDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
