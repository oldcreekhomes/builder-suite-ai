import React, { useState } from "react";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { TaskTable } from "./TaskTable";
import { Timeline } from "./Timeline";
import { AddTaskDialog } from "./AddTaskDialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { 
  getIndentLevel, 
  generateHierarchyNumber,
  generateIndentHierarchy,
  generateOutdentHierarchy,
  renumberTasks
} from "@/utils/hierarchyUtils";

interface CustomGanttChartProps {
  projectId: string;
}

export function CustomGanttChart({ projectId }: CustomGanttChartProps) {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { updateTask, createTask, deleteTask } = useTaskMutations(projectId);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Calculate timeline range from task dates
  const timelineStart = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime())))
    : new Date();
  
  const timelineEnd = tasks.length > 0
    ? new Date(Math.max(...tasks.map(t => new Date(t.end_date).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const handleTaskMove = async (taskId: string, direction: 'up' | 'down') => {
    try {
      const sortedTasks = [...tasks].sort((a, b) => {
        const aNum = a.hierarchy_number || "999";
        const bNum = b.hierarchy_number || "999";
        return aNum.localeCompare(bNum, undefined, { numeric: true });
      });

      const currentIndex = sortedTasks.findIndex(t => t.id === taskId);
      if (currentIndex === -1) return;

      let targetIndex: number;
      if (direction === 'up') {
        targetIndex = Math.max(0, currentIndex - 1);
      } else {
        targetIndex = Math.min(sortedTasks.length - 1, currentIndex + 1);
      }

      if (targetIndex === currentIndex) return; // No movement needed

      // Swap hierarchy numbers with the target task
      const currentTask = sortedTasks[currentIndex];
      const targetTask = sortedTasks[targetIndex];

      if (currentTask && targetTask) {
        await Promise.all([
          updateTask.mutateAsync({
            id: currentTask.id,
            hierarchy_number: targetTask.hierarchy_number
          }),
          updateTask.mutateAsync({
            id: targetTask.id,
            hierarchy_number: currentTask.hierarchy_number
          })
        ]);
        
        toast.success(`Task moved ${direction} successfully`);
      }
    } catch (error) {
      console.error(`Failed to move task ${direction}:`, error);
      toast.error(`Failed to move task ${direction}`);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        ...updates
      });
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleIndent = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newHierarchyNumber = generateIndentHierarchy(task, tasks);
    if (!newHierarchyNumber) {
      toast.error("Cannot indent this task");
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: taskId,
        hierarchy_number: newHierarchyNumber
      });
      toast.success("Task indented successfully");
    } catch (error) {
      console.error("Failed to indent task:", error);
      toast.error("Failed to indent task");
    }
  };

  const handleOutdent = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newHierarchyNumber = generateOutdentHierarchy(task, tasks);
    if (!newHierarchyNumber) {
      toast.error("Cannot outdent this task");
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: taskId,
        hierarchy_number: newHierarchyNumber
      });
      toast.success("Task outdented successfully");
    } catch (error) {
      console.error("Failed to outdent task:", error);
      toast.error("Failed to outdent task");
    }
  };

  const getNextTopLevelNumber = (tasks: ProjectTask[]): string => {
    const topLevelNumbers = tasks
      .map(t => t.hierarchy_number?.split('.')[0])
      .filter(n => n)
      .map(n => parseInt(n) || 0);
    
    return topLevelNumbers.length > 0 
      ? (Math.max(...topLevelNumbers) + 1).toString()
      : "1";
  };

  const findInsertionPoint = (tasks: ProjectTask[], relativeTaskId: string, position: 'above' | 'below'): number => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const aNum = a.hierarchy_number || "999";
      const bNum = b.hierarchy_number || "999";
      return aNum.localeCompare(bNum, undefined, { numeric: true });
    });

    const relativeIndex = sortedTasks.findIndex(t => t.id === relativeTaskId);
    if (relativeIndex === -1) return sortedTasks.length;

    if (position === 'above') {
      return relativeIndex;
    } else {
      // For 'below', find the end of this task's children
      const relativeTask = sortedTasks[relativeIndex];
      const relativeHierarchy = relativeTask.hierarchy_number || "1";
      
      let endIndex = relativeIndex + 1;
      while (endIndex < sortedTasks.length) {
        const nextHierarchy = sortedTasks[endIndex].hierarchy_number || "";
        if (!nextHierarchy.startsWith(relativeHierarchy + ".")) {
          break;
        }
        endIndex++;
      }
      return endIndex;
    }
  };

  const handleAddTask = async (position: 'above' | 'below', relativeTaskId: string) => {
    try {
      // Always create top-level tasks
      const newHierarchyNumber = getNextTopLevelNumber(tasks);
      const insertionPoint = findInsertionPoint(tasks, relativeTaskId, position);

      // Create the new task first
      const defaultStartDate = new Date();
      const defaultEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      await createTask.mutateAsync({
        project_id: projectId,
        task_name: "New Task",
        start_date: defaultStartDate.toISOString(),
        end_date: defaultEndDate.toISOString(),
        duration: 1,
        progress: 0,
        hierarchy_number: newHierarchyNumber
      });

      // Get updated tasks and renumber them cleanly
      const updatedTasks = [...tasks];
      
      // Remove the newly created task from its current position and insert at the right place
      const newTaskIndex = updatedTasks.findIndex(t => t.hierarchy_number === newHierarchyNumber);
      if (newTaskIndex !== -1) {
        const [newTask] = updatedTasks.splice(newTaskIndex, 1);
        updatedTasks.splice(insertionPoint, 0, newTask);
      }

      // Renumber all tasks cleanly
      const renumberedTasks = renumberTasks(updatedTasks);
      
      // Update hierarchy numbers for all tasks
      for (const task of renumberedTasks) {
        if (task.hierarchy_number) {
          await updateTask.mutateAsync({
            id: task.id,
            hierarchy_number: task.hierarchy_number
          });
        }
      }
      
      toast.success("Task added successfully");
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    try {
      // Sort tasks by hierarchy number to get correct order
      const sortedTasks = [...tasks].sort((a, b) => {
        const aNum = a.hierarchy_number || "999";
        const bNum = b.hierarchy_number || "999";
        return aNum.localeCompare(bNum, undefined, { numeric: true });
      });

      const deleteIndex = sortedTasks.findIndex(t => t.id === taskId);
      const deletedHierarchy = taskToDelete.hierarchy_number || "1";
      
      // Find all tasks that need to be deleted (the task and its children)
      const tasksToDelete = [taskToDelete];
      for (let i = deleteIndex + 1; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        const hierarchy = task.hierarchy_number || "";
        if (hierarchy.startsWith(deletedHierarchy + ".")) {
          tasksToDelete.push(task);
        } else {
          break;
        }
      }

      // Delete the task and its children
      for (const task of tasksToDelete) {
        await deleteTask.mutateAsync(task.id);
      }

      // Find tasks that come after the deleted range and need renumbering
      const endDeleteIndex = deleteIndex + tasksToDelete.length;
      const tasksToRenumber = sortedTasks.slice(endDeleteIndex);
      
      // Renumber all subsequent tasks
      for (const task of tasksToRenumber) {
        const currentHierarchy = task.hierarchy_number || "1";
        const hierarchyParts = currentHierarchy.split('.');
        
        if (hierarchyParts.length === 1) {
          // This is a parent-level task - decrement by 1
          const currentMainNumber = parseInt(hierarchyParts[0]) || 1;
          const newMainNumber = currentMainNumber - 1;
          await updateTask.mutateAsync({
            id: task.id,
            hierarchy_number: newMainNumber.toString()
          });
        } else {
          // This is a child task - decrement the parent number
          const currentParentNumber = parseInt(hierarchyParts[0]) || 1;
          const newParentNumber = currentParentNumber - 1;
          const newSubHierarchy = [newParentNumber, ...hierarchyParts.slice(1)].join('.');
          await updateTask.mutateAsync({
            id: task.id,
            hierarchy_number: newSubHierarchy
          });
        }
      }
      
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <p className="text-muted-foreground">Loading schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <p className="text-destructive">Error loading schedule: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gantt Chart Container */}
      <div className="bg-card text-card-foreground rounded-lg border overflow-hidden">
        {/* Toolbar */}
        <ScheduleToolbar
          selectedTasks={selectedTasks}
          tasks={tasks}
          projectId={projectId}
          onAddTask={() => setShowAddTaskDialog(true)}
          onTaskUpdate={handleTaskUpdate}
          onPublish={() => setShowPublishDialog(true)}
        />
        
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
          {/* Left Side - Task Table */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
        <TaskTable
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          selectedTasks={selectedTasks}
          onSelectedTasksChange={setSelectedTasks}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onMoveUp={(taskId) => handleTaskMove(taskId, 'up')}
          onMoveDown={(taskId) => handleTaskMove(taskId, 'down')}
        />
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle />

          {/* Right Side - Timeline */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <Timeline
              tasks={tasks}
              startDate={timelineStart}
              endDate={timelineEnd}
              onTaskUpdate={handleTaskUpdate}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog 
        projectId={projectId}
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
      />

      {/* Publish Dialog */}
      <PublishScheduleDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onPublish={(data) => {
          // Handle publish logic here
          console.log("Publishing schedule with data:", data);
          toast.success("Schedule published successfully");
        }}
      />
    </div>
  );
}