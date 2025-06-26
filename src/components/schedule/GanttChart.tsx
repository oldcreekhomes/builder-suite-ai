
import React, { useState } from "react";
import { ScheduleTask, useUpdateScheduleTask, useAddScheduleTask, useDeleteScheduleTask } from "@/hooks/useProjectSchedule";
import { GanttTable } from "./GanttTable";
import { GanttEmptyState } from "./GanttEmptyState";
import { AddTaskDialog } from "./AddTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

interface NewTask {
  task_name: string;
  start_date: string;
  duration: number;
  resources: string;
  predecessor_id?: string;
}

interface GanttChartProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function GanttChart({ tasks, onTaskUpdate, projectId }: GanttChartProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [newTask, setNewTask] = useState<NewTask>({
    task_name: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    duration: 1,
    resources: "",
    predecessor_id: undefined,
  });

  const addTaskMutation = useAddScheduleTask();
  const { toast } = useToast();

  const handleQuickAddTask = () => {
    setIsAddDialogOpen(true);
  };

  const handleTaskAdded = () => {
    onTaskUpdate();
  };

  const handleStartEditing = (taskId: string, field: string, currentValue: string | number) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue.toString());
  };

  const handleSaveEdit = () => {
    // This will be handled by GanttTable's handleInlineEdit
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleEditValueChange = (value: string) => {
    setEditValue(value);
  };

  const handleEditTask = (task: ScheduleTask) => {
    // Handle task editing if needed
  };

  const handleDeleteTask = (taskId: string) => {
    // Handle task deletion if needed
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
      setSelectedTasks(new Set(tasks.map(task => task.id)));
    } else {
      setSelectedTasks(new Set());
    }
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

  const getParentTasks = () => {
    // For now, treat all tasks as parent tasks
    // This can be enhanced later with proper parent-child relationships
    return tasks;
  };

  const getChildTasks = (parentId: string): ScheduleTask[] => {
    // For now, return empty array
    // This can be enhanced later with proper parent-child relationships
    return [];
  };

  const handleNewTaskChange = (updatedTask: NewTask) => {
    setNewTask(updatedTask);
  };

  const handleSaveNewTask = async () => {
    try {
      const taskCode = `T${(tasks.length + 1).toString().padStart(3, '0')}`;
      const endDate = addDays(new Date(newTask.start_date), newTask.duration - 1);
      
      const taskToAdd = {
        project_id: projectId,
        task_code: taskCode,
        task_name: newTask.task_name,
        start_date: newTask.start_date,
        end_date: format(endDate, 'yyyy-MM-dd'),
        duration: newTask.duration,
        progress: 0,
        resources: newTask.resources ? newTask.resources.split(',').map(r => r.trim()) : [],
        predecessor_id: newTask.predecessor_id || null,
      };

      await addTaskMutation.mutateAsync(taskToAdd);
      setIsAddingTask(false);
      setNewTask({
        task_name: "",
        start_date: format(new Date(), 'yyyy-MM-dd'),
        duration: 1,
        resources: "",
        predecessor_id: undefined,
      });
      onTaskUpdate();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAddingTask(!isAddingTask)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <GanttTable
          tasks={tasks}
          parentTasks={getParentTasks()}
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
