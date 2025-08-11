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
// Simplified hierarchy imports - only basic functions
import { getLevel, generateIndentHierarchy, generateIndentUpdates } from "@/utils/hierarchyUtils";

interface CustomGanttChartProps {
  projectId: string;
}

export function CustomGanttChart({ projectId }: CustomGanttChartProps) {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { updateTask, createTask, deleteTask } = useTaskMutations(projectId);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Helper function to calculate end date from start date + duration
  const calculateEndDate = (startDate: string, duration: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);
    return end;
  };

  // Calculate timeline range from task dates using calculated end dates
  const timelineStart = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime())))
    : new Date();
  
  const timelineEnd = tasks.length > 0
    ? new Date(Math.max(...tasks.map(t => calculateEndDate(t.start_date, t.duration).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // DISABLED: Task move functionality - will be reimplemented later
  const handleTaskMove = async (taskId: string, direction: 'up' | 'down') => {
    toast.info("Task movement temporarily disabled during refactoring");
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
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks) return;
    
    // Import the new function
    const { generateIndentUpdates } = await import("@/utils/hierarchyUtils");
    const updates = generateIndentUpdates(task, tasks);
    
    if (updates.length === 0) {
      toast.error("Cannot indent this task");
      return;
    }
    
    try {
      // Apply all updates in batch
      for (const update of updates) {
        await updateTask.mutateAsync({
          id: update.id,
          hierarchy_number: update.hierarchy_number
        });
      }
      toast.success("Task indented successfully");
    } catch (error) {
      toast.error("Failed to indent task");
      console.error("Error indenting task:", error);
    }
  };

  // DISABLED: Outdent functionality - will be reimplemented step by step
  const handleOutdent = async (taskId: string) => {
    toast.info("Outdent functionality temporarily disabled during refactoring");
  };

  // SIMPLE: Just add tasks at the end for now
  const getNextTopLevelNumber = (tasks: ProjectTask[]): string => {
    const topLevelNumbers = tasks
      .map(t => t.hierarchy_number?.split('.')[0])
      .filter(n => n)
      .map(n => parseInt(n) || 0);
    
    return topLevelNumbers.length > 0 
      ? (Math.max(...topLevelNumbers) + 1).toString()
      : "1";
  };

  // SIMPLIFIED: Only "add at end" for now - will add positioning later
  const handleAddTask = async () => {
    try {
      const newHierarchyNumber = getNextTopLevelNumber(tasks);
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
      
      toast.success("Task added successfully");
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  };

  // DISABLED: Complex add positioning - will be reimplemented later
  const handleAddTaskPositioned = async (position: 'above' | 'below', relativeTaskId: string) => {
    toast.info("Positioned task adding temporarily disabled during refactoring");
  };

  // SIMPLIFIED: Just delete the task without complex renumbering for now
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
          onAddTask={handleAddTask}
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
          onAddTask={handleAddTaskPositioned}
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

      {/* DISABLED: AddTaskDialog during refactoring - using simple add instead */}
      {/* <AddTaskDialog 
        projectId={projectId}
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
      /> */}

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