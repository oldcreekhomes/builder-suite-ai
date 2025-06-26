
import React, { useState } from "react";
import { ScheduleTask, useUpdateScheduleTask, useAddScheduleTask, useDeleteScheduleTask } from "@/hooks/useProjectSchedule";
import { SyncfusionGantt } from "./SyncfusionGantt";
import { GanttEmptyState } from "./GanttEmptyState";
import { AddTaskDialog } from "./AddTaskDialog";
import { GanttTable } from "./GanttTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays } from "date-fns";

interface GanttChartProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

interface EditingCell {
  taskId: string;
  field: string;
}

interface NewTask {
  task_name: string;
  start_date: string;
  duration: number;
  resources: string;
  predecessor_id?: string;
}

export function GanttChart({ tasks, onTaskUpdate, projectId }: GanttChartProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    task_name: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    duration: 1,
    resources: "",
    predecessor_id: undefined,
  });
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const updateTaskMutation = useUpdateScheduleTask();
  const { toast } = useToast();

  const handleQuickAddTask = () => {
    setIsAddDialogOpen(true);
  };

  const handleTaskAdded = () => {
    onTaskUpdate();
  };

  const handleStartEditing = (taskId: string, field: string, currentValue: string | number) => {
    setEditingCell({ taskId, field });
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const task = tasks.find(t => t.id === editingCell.taskId);
    if (!task) return;

    try {
      let updates: Partial<ScheduleTask> = {};
      
      switch (editingCell.field) {
        case 'task_name':
          updates.task_name = editValue;
          break;
        case 'duration':
          const duration = parseInt(editValue);
          if (isNaN(duration) || duration <= 0) {
            toast({
              title: "Invalid Duration",
              description: "Duration must be a positive number",
              variant: "destructive",
            });
            return;
          }
          updates.duration = duration;
          // Recalculate end date
          const startDate = parseISO(task.start_date);
          const endDate = addDays(startDate, duration - 1);
          updates.end_date = format(endDate, 'yyyy-MM-dd');
          break;
        case 'progress':
          const progress = parseInt(editValue);
          if (isNaN(progress) || progress < 0 || progress > 100) {
            toast({
              title: "Invalid Progress",
              description: "Progress must be between 0 and 100",
              variant: "destructive",
            });
            return;
          }
          updates.progress = progress;
          break;
        case 'start_date':
          updates.start_date = editValue;
          // Recalculate end date
          const newStartDate = parseISO(editValue);
          const newEndDate = addDays(newStartDate, task.duration - 1);
          updates.end_date = format(newEndDate, 'yyyy-MM-dd');
          break;
        case 'predecessor_id':
          updates.predecessor_id = editValue === 'none' ? null : editValue;
          break;
      }

      await updateTaskMutation.mutateAsync({ id: editingCell.taskId, updates });
      setEditingCell(null);
      setEditValue("");
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleEditValueChange = (value: string) => {
    setEditValue(value);
  };

  const handleEditTask = (task: ScheduleTask) => {
    // This can be used for opening a detailed edit modal if needed
    console.log('Edit task:', task);
  };

  const handleDeleteTask = (taskId: string) => {
    // Implementation for deleting task
    console.log('Delete task:', taskId);
  };

  const handleToggleSection = (taskId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleNewTaskChange = (updatedTask: NewTask) => {
    setNewTask(updatedTask);
  };

  const handleSaveNewTask = () => {
    // Implementation for saving new task
    setIsAddingTask(false);
  };

  const handleCancelNewTask = () => {
    setIsAddingTask(false);
    setNewTask({
      task_name: "",
      start_date: format(new Date(), 'yyyy-MM-dd'),
      duration: 1,
      resources: "",
      predecessor_id: undefined,
    });
  };

  // Helper functions for task hierarchy
  const parentTasks = tasks.filter(task => !task.predecessor_id);
  const getChildTasks = (parentId: string): ScheduleTask[] => {
    return tasks.filter(task => task.predecessor_id === parentId);
  };

  if (tasks.length === 0) {
    return (
      <>
        <GanttEmptyState onQuickAddTask={handleQuickAddTask} />
        <AddTaskDialog
          projectId={projectId}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onTaskAdded={handleTaskAdded}
          existingTasks={tasks}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleQuickAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <GanttTable
          tasks={tasks}
          parentTasks={parentTasks}
          collapsedSections={collapsedSections}
          editingCell={editingCell}
          editValue={editValue}
          isAddingTask={isAddingTask}
          newTask={newTask}
          selectedTasks={selectedTasks}
          getChildTasks={getChildTasks}
          onStartEditing={handleStartEditing}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onEditValueChange={handleEditValueChange}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onToggleSection={handleToggleSection}
          onNewTaskChange={handleNewTaskChange}
          onSaveNewTask={handleSaveNewTask}
          onCancelNewTask={handleCancelNewTask}
          onSelectTask={handleSelectTask}
          onSelectAll={handleSelectAll}
        />
      </div>

      <AddTaskDialog
        projectId={projectId}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onTaskAdded={handleTaskAdded}
        existingTasks={tasks}
      />
    </div>
  );
}
