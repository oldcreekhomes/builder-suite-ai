
import React, { useRef, useEffect } from "react";
import { Gantt } from "@svar/gantt";
import "@svar/gantt/gantt.css";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface SyncfusionGanttProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

export function SyncfusionGantt({ tasks, onTaskUpdate, projectId }: SyncfusionGanttProps) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<any>(null);

  // Transform our tasks to SVAR format
  const transformedTasks = tasks.map((task, index) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    
    // Ensure valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(`Invalid dates for task ${task.task_name}`);
      return null;
    }

    return {
      id: task.id,
      text: task.task_name || `Task ${index + 1}`,
      start: startDate,
      end: endDate,
      duration: Math.max(1, task.duration || 1),
      progress: Math.min(100, Math.max(0, task.progress || 0)) / 100, // SVAR expects 0-1 range
      type: "task",
      parent: task.predecessor_id || null,
    };
  }).filter(Boolean); // Remove null entries

  // Initialize SVAR Gantt
  useEffect(() => {
    if (ganttRef.current && transformedTasks.length > 0) {
      // Destroy existing instance if it exists
      if (ganttInstance.current) {
        ganttInstance.current.destructor();
      }

      // Create new Gantt instance
      ganttInstance.current = new Gantt(ganttRef.current, {
        tasks: transformedTasks,
        scales: [
          { unit: "week", step: 1, format: "dd MMM" },
          { unit: "day", step: 1, format: "dd" }
        ],
        columns: [
          { name: "text", label: "Task Name", width: 250, tree: true },
          { name: "start", label: "Start", width: 100, align: "center" },
          { name: "duration", label: "Duration", width: 80, align: "center" },
          { name: "progress", label: "Progress", width: 80, align: "center" }
        ]
      });

      // Add event handlers
      ganttInstance.current.on("update-task", (task: any) => {
        console.log("Task updated:", task);
        onTaskUpdate();
      });

      ganttInstance.current.on("add-task", (task: any) => {
        console.log("Task added:", task);
        onTaskUpdate();
      });

      ganttInstance.current.on("delete-task", (task: any) => {
        console.log("Task deleted:", task);
        onTaskUpdate();
      });
    }

    return () => {
      if (ganttInstance.current) {
        ganttInstance.current.destructor();
        ganttInstance.current = null;
      }
    };
  }, [transformedTasks, onTaskUpdate]);

  // Show loading state if no valid tasks
  if (transformedTasks.length === 0) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No valid tasks to display</p>
          <p className="text-sm text-gray-500">Add tasks with valid dates to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <div 
        ref={ganttRef} 
        className="w-full h-full rounded-lg border border-gray-200"
        style={{ minHeight: "600px" }}
      />
    </div>
  );
}
