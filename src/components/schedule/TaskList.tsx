import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  progress: number;
  assigned_to?: string;
  color: string;
}

interface TaskListProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
}

export function TaskList({ tasks, onEditTask, onDeleteTask, onTaskClick }: TaskListProps) {
  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200';
    if (progress < 30) return 'bg-red-200 text-red-800';
    if (progress < 70) return 'bg-yellow-200 text-yellow-800';
    if (progress < 100) return 'bg-blue-200 text-blue-800';
    return 'bg-green-200 text-green-800';
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div 
          key={task.id}
          className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => onTaskClick?.(task)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: task.color }}
                />
                <h3 className="font-medium text-foreground truncate">
                  {task.task_name}
                </h3>
                <Badge variant="outline" className={getProgressColor(task.progress)}>
                  {task.progress}%
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.start_date), 'MMM d')} - {format(new Date(task.end_date), 'MMM d')}
                </div>
                {task.assigned_to && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assigned_to}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask?.(task);
                }}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask?.(task.id);
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      
      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks scheduled yet</p>
          <p className="text-sm">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
}