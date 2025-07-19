import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Trash2, ChevronDown } from 'lucide-react';

interface TaskEditDialogProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: any) => void;
  onDelete: (taskId: string) => void;
  availableTasks?: any[];
}

export function TaskEditDialog({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  availableTasks = []
}: TaskEditDialogProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    start_date: '',
    end_date: '',
    progress: 0,
    assigned_to: '',
    parent_id: '',
    color: '#3b82f6'
  });

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name || '',
        start_date: task.start_date || '',
        end_date: task.end_date || '',
        progress: task.progress || 0,
        parent_id: task.parent_id || '',
        assigned_to: task.assigned_to || '',
        color: task.color || '#3b82f6'
      });
    }
  }, [task]);

  const handleSave = () => {
    if (task) {
      onSave(task.id, formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (task && confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  const colorOptions = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#84cc16', label: 'Lime' },
    { value: '#f97316', label: 'Orange' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task_name" className="text-right">
              Name
            </Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start_date" className="text-right">
              Start Date
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end_date" className="text-right">
              End Date
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">
              Progress ({formData.progress}%)
            </Label>
            <div className="col-span-3">
              <Slider
                value={[formData.progress]}
                onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="parent_id" className="text-right">
              Parent Task
            </Label>
            <Select
              value={formData.parent_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? null : value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select parent task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent</SelectItem>
                {task?.availableParents?.map((parentTask: any) => (
                  <SelectItem key={parentTask.id} value={parentTask.id}>
                    {parentTask.task_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assigned_to" className="text-right">
              Resource
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="col-span-3 justify-between"
                >
                  {formData.assigned_to || "Select resource..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="max-h-[200px] overflow-auto">
                  {task?.availableResources?.map((resource: any) => (
                    <div
                      key={resource.resourceId}
                      className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          assigned_to: formData.assigned_to === resource.resourceName ? '' : resource.resourceName 
                        });
                      }}
                    >
                      <Checkbox
                        checked={formData.assigned_to === resource.resourceName}
                        onChange={() => {}}
                      />
                      <span className="text-sm">{resource.resourceName}</span>
                    </div>
                  ))}
                  {(!task?.availableResources || task.availableResources.length === 0) && (
                    <div className="p-2 text-sm text-muted-foreground">
                      No resources available
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <Select
              value={formData.color}
              onValueChange={(value) => setFormData({ ...formData, color: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}