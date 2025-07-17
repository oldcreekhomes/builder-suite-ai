import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface TaskListProps {
  tasks: any[];
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskList({ tasks, onEditTask, onDeleteTask }: TaskListProps) {
  return (
    <div className="bg-card border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="font-medium">Task List</h3>
      </div>
      <div className="divide-y">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
            <div className="flex-1">
              <div className="font-medium">{task.task_name}</div>
              <div className="text-sm text-muted-foreground">
                {task.start_date} - {task.end_date} • {task.progress}% complete
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditTask(task)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteTask(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}