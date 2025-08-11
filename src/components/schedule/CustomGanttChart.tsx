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

    // Find the task above this one in the hierarchy
    const sortedTasks = [...tasks].sort((a, b) => {
      const aNum = a.hierarchy_number || "999";
      const bNum = b.hierarchy_number || "999";
      return aNum.localeCompare(bNum, undefined, { numeric: true });
    });

    const currentIndex = sortedTasks.findIndex(t => t.id === taskId);
    if (currentIndex > 0) {
      const parentTask = sortedTasks[currentIndex - 1];
      try {
        await updateTask.mutateAsync({
          id: taskId,
          parent_id: parentTask.id
        });
        toast.success("Task indented successfully");
      } catch (error) {
        console.error("Failed to indent task:", error);
        toast.error("Failed to indent task");
      }
    }
  };

  const handleOutdent = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.hierarchy_number) return;

    const hierarchyParts = task.hierarchy_number.split(".");
    
    // Can't outdent if already at top level
    if (hierarchyParts.length <= 1) return;

    try {
      // Simplified outdent - just remove parent
      await updateTask.mutateAsync({
        id: taskId,
        parent_id: null
      });
      toast.success("Task outdented successfully");
    } catch (error) {
      console.error("Failed to outdent task:", error);
      toast.error("Failed to outdent task");
    }
  };

  const handleAddTask = async (position: 'above' | 'below', relativeTaskId: string) => {
    const relativeTask = tasks.find(t => t.id === relativeTaskId);
    if (!relativeTask) return;

    try {
      // Sort tasks by hierarchy number to get correct order
      const sortedTasks = [...tasks].sort((a, b) => {
        const aNum = a.hierarchy_number || "999";
        const bNum = b.hierarchy_number || "999";
        return aNum.localeCompare(bNum, undefined, { numeric: true });
      });

      const relativeIndex = sortedTasks.findIndex(t => t.id === relativeTaskId);
      let insertIndex: number;
      let newHierarchyNumber: string;

      // Determine insertion point and hierarchy number
      if (position === 'above') {
        insertIndex = relativeIndex;
        newHierarchyNumber = relativeTask.hierarchy_number || "1";
      } else {
        insertIndex = relativeIndex + 1;
        // For below, we need to check if there are children of the relative task
        const relativeHierarchy = relativeTask.hierarchy_number || "1";
        const nextTaskIndex = relativeIndex + 1;
        
        if (nextTaskIndex < sortedTasks.length) {
          const nextTask = sortedTasks[nextTaskIndex];
          const nextHierarchy = nextTask.hierarchy_number || "999";
          
          // If next task is a child of relative task, insert after all children
          if (nextHierarchy.startsWith(relativeHierarchy + ".")) {
            // Find where children end
            let endOfChildren = nextTaskIndex;
            while (endOfChildren < sortedTasks.length && 
                   (sortedTasks[endOfChildren].hierarchy_number || "").startsWith(relativeHierarchy + ".")) {
              endOfChildren++;
            }
            insertIndex = endOfChildren;
          }
        }
        
        // Calculate new hierarchy number based on insertion point
        if (insertIndex < sortedTasks.length) {
          const taskAtIndex = sortedTasks[insertIndex];
          newHierarchyNumber = taskAtIndex.hierarchy_number || "999";
        } else {
          // Inserting at the end
          const lastTask = sortedTasks[sortedTasks.length - 1];
          const lastHierarchy = lastTask?.hierarchy_number || "0";
          const lastNum = parseInt(lastHierarchy.split('.')[0]) || 0;
          newHierarchyNumber = (lastNum + 1).toString();
        }
      }

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

      // Now renumber all tasks that come after the insertion point
      const tasksToRenumber = sortedTasks.slice(insertIndex);
      
      for (const task of tasksToRenumber) {
        const currentHierarchy = task.hierarchy_number || "1";
        const hierarchyParts = currentHierarchy.split('.');
        const mainNumber = parseInt(hierarchyParts[0]) || 1;
        
        // Only increment main level tasks
        if (hierarchyParts.length === 1) {
          const newMainNumber = mainNumber + 1;
          await updateTask.mutateAsync({
            id: task.id,
            hierarchy_number: newMainNumber.toString()
          });
        } else {
          // For sub-tasks, update the parent reference
          const newParentNumber = parseInt(hierarchyParts[0]) + 1;
          const newSubHierarchy = [newParentNumber, ...hierarchyParts.slice(1)].join('.');
          await updateTask.mutateAsync({
            id: task.id,
            hierarchy_number: newSubHierarchy
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
    try {
      await deleteTask.mutateAsync(taskId);
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