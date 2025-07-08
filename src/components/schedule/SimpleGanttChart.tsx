import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Edit, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  progress: number;
  assigned_to?: string;
  color: string;
  duration?: number;
}

interface SimpleGanttChartProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskAdd?: (task: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function SimpleGanttChart({ tasks, onTaskUpdate, onTaskDelete }: SimpleGanttChartProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No tasks found</h3>
              <p className="text-muted-foreground">Create your first task to get started with project scheduling.</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{task.task_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement edit functionality
                        console.log('Edit task:', task.id);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this task?')) {
                          onTaskDelete?.(task.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDate(task.start_date)} - {formatDate(task.end_date)}
                    </span>
                  </div>
                  
                  {task.assigned_to && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{task.assigned_to}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.duration || 1} day(s)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <Badge variant="outline">{task.progress || 0}%</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(task.progress || 0)}`}
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Visual timeline representation */}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">Timeline</span>
                  </div>
                  <div className="relative h-8 bg-muted rounded-md overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded-md opacity-80 transition-all"
                      style={{
                        backgroundColor: task.color,
                        left: '0%',
                        width: '100%'
                      }}
                    />
                    <div
                      className="absolute top-0 h-full bg-white/20 rounded-md"
                      style={{
                        left: '0%',
                        width: `${task.progress || 0}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}