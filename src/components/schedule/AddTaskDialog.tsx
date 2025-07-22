
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useTaskMutations } from '@/hooks/useTaskMutations';

interface AddTaskDialogProps {
  projectId: string;
}

export const AddTaskDialog: React.FC<AddTaskDialogProps> = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '',
    start_date: '',
    end_date: '',
    duration: 1,
    progress: 0,
    resources: '',
    predecessor: '',
  });

  const { createTask } = useTaskMutations(projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.task_name || !formData.start_date || !formData.end_date) {
      return;
    }

    createTask.mutate({
      project_id: projectId,
      task_name: formData.task_name,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      duration: formData.duration,
      progress: formData.progress,
      resources: formData.resources || null,
      predecessor: formData.predecessor || null,
    });

    setFormData({
      task_name: '',
      start_date: '',
      end_date: '',
      duration: 1,
      progress: 0,
      resources: '',
      predecessor: '',
    });
    setOpen(false);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task_name">Task Name *</Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => handleChange('task_name', e.target.value)}
              placeholder="Enter task name"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => handleChange('progress', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="resources">Resources</Label>
            <Input
              id="resources"
              value={formData.resources}
              onChange={(e) => handleChange('resources', e.target.value)}
              placeholder="Enter resource names"
            />
          </div>

          <div>
            <Label htmlFor="predecessor">Dependencies</Label>
            <Input
              id="predecessor"
              value={formData.predecessor}
              onChange={(e) => handleChange('predecessor', e.target.value)}
              placeholder="e.g., 1FS, 2SS (task ID + dependency type)"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
