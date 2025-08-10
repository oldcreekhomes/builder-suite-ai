import React, { useState } from "react";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { TaskTable } from "./TaskTable";
import { Timeline } from "./Timeline";
import { AddTaskDialog } from "./AddTaskDialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Plus, Send } from "lucide-react";
import { toast } from "sonner";

interface CustomGanttChartProps {
  projectId: string;
}

export function CustomGanttChart({ projectId }: CustomGanttChartProps) {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { updateTask } = useTaskMutations(projectId);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Calculate timeline range from task dates
  const timelineStart = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => new Date(t.start_date).getTime())))
    : new Date();
  
  const timelineEnd = tasks.length > 0
    ? new Date(Math.max(...tasks.map(t => new Date(t.end_date).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const handleTaskMove = async (taskId: string, newHierarchyNumber: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        hierarchy_number: newHierarchyNumber
      });
      toast.success("Task moved successfully");
    } catch (error) {
      console.error("Failed to move task:", error);
      toast.error("Failed to move task");
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
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AddTaskDialog projectId={projectId} />
          <Button
            onClick={() => setShowPublishDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Publish Schedule
          </Button>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-card text-card-foreground rounded-lg border overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
          {/* Left Side - Task Table */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <TaskTable
              tasks={tasks}
              onTaskMove={handleTaskMove}
              onTaskUpdate={handleTaskUpdate}
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