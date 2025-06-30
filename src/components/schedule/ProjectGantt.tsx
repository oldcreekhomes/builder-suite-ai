
import React from 'react';
import { useProjectSchedule } from '@/hooks/useProjectSchedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectGanttProps {
  projectId: string;
}

export const ProjectGantt: React.FC<ProjectGanttProps> = ({ projectId }) => {
  const { tasks, isLoading, error } = useProjectSchedule(projectId);

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            Error loading schedule: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            Loading schedule...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Schedule</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Gantt chart component ready for implementation with your preferred library.
          </p>
          
          {/* Display basic task data for now */}
          <div className="space-y-2">
            <h3 className="font-semibold">Current Tasks:</h3>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{task.task_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(task.start_date).toLocaleDateString()} - {new Date(task.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm">Progress: {task.progress}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No tasks found</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
