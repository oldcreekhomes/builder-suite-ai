
import React, { useState } from "react";
import { ScheduleTask, useUpdateScheduleTask, useAddScheduleTask, useDeleteScheduleTask } from "@/hooks/useProjectSchedule";
import { SyncfusionGantt } from "./SyncfusionGantt";
import { GanttEmptyState } from "./GanttEmptyState";
import { AddTaskDialog } from "./AddTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface GanttChartProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function GanttChart({ tasks, onTaskUpdate, projectId }: GanttChartProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleQuickAddTask = () => {
    setIsAddDialogOpen(true);
  };

  const handleTaskAdded = () => {
    onTaskUpdate();
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
        <SyncfusionGantt
          tasks={tasks}
          onTaskUpdate={onTaskUpdate}
          projectId={projectId}
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
