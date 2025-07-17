import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { Calendar, Clock, User } from 'lucide-react';

interface TaskFormData {
  task_name: string;
  start_date: string;
  end_date: string;
  assigned_to?: string;
  color: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  progress: number;
  type: 'task' | 'milestone' | 'project';
}

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => void;
  isLoading?: boolean;
}

export function AddTaskModal({ open, onOpenChange, onSubmit, isLoading }: AddTaskModalProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      color: '#3b82f6',
      priority: 'normal',
      progress: 0,
      type: 'task'
    }
  });

  const handleFormSubmit = (data: TaskFormData) => {
    console.log('Form submitted with data:', data);
    onSubmit(data);
    reset();
  };

  const handleInvalidSubmit = (errors: any) => {
    console.log('Form validation failed:', errors);
    console.log('Please check all required fields: Task Name, Start Date, and End Date');
  };

  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add New Task
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task for your project schedule.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="task_name">Task Name *</Label>
            <Input
              id="task_name"
              {...register('task_name', { required: 'Task name is required' })}
              placeholder="Enter task name"
            />
            {errors.task_name && (
              <p className="text-sm text-destructive">{errors.task_name.message}</p>
            )}
          </div>

          {/* Task Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Schedule Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Start Date *
              </Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date', { required: 'Start date is required' })}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                End Date *
              </Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date', { required: 'End date is required' })}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Assigned To
            </Label>
            <Input
              id="assigned_to"
              {...register('assigned_to')}
              placeholder="Enter assignee name"
            />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Label>Progress (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              {...register('progress', { 
                valueAsNumber: true,
                min: { value: 0, message: 'Progress must be at least 0%' },
                max: { value: 100, message: 'Progress cannot exceed 100%' }
              })}
              placeholder="0"
            />
            {errors.progress && (
              <p className="text-sm text-destructive">{errors.progress.message}</p>
            )}
          </div>

          {/* Task Color */}
          <div className="space-y-2">
            <Label>Task Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    value={color}
                    {...register('color')}
                    className="sr-only"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-transparent hover:border-ring transition-colors"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}