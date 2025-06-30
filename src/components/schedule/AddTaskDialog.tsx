
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GanttTask } from './GanttChart';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: Omit<GanttTask, 'id'>) => void;
  existingTasks: GanttTask[];
}

export const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  open,
  onOpenChange,
  onAddTask,
  existingTasks
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    startDate: '',
    duration: 1,
    progress: 0,
    predecessor: 'none',
    resources: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDate = new Date(formData.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + formData.duration);

    const newTask: Omit<GanttTask, 'id'> = {
      code: formData.code,
      name: formData.name,
      startDate,
      duration: formData.duration,
      endDate,
      progress: formData.progress,
      predecessor: formData.predecessor === 'none' ? undefined : formData.predecessor,
      resources: formData.resources.split(',').map(r => r.trim()).filter(r => r.length > 0)
    };

    onAddTask(newTask);
    setFormData({
      code: '',
      name: '',
      startDate: '',
      duration: 1,
      progress: 0,
      predecessor: 'none',
      resources: ''
    });
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Task Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="e.g., T001"
                required
              />
            </div>
            <div>
              <Label htmlFor="name">Task Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Foundation Work"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => handleInputChange('progress', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="predecessor">Predecessor Task</Label>
              <Select value={formData.predecessor} onValueChange={(value) => handleInputChange('predecessor', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select predecessor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {existingTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.code}: {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="resources">Resources (comma-separated)</Label>
            <Input
              id="resources"
              value={formData.resources}
              onChange={(e) => handleInputChange('resources', e.target.value)}
              placeholder="e.g., John Doe, Excavator, Concrete Mixer"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
