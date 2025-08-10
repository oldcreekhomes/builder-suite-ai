import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { TaskRow } from "./TaskRow";
import { generateHierarchyNumber } from "@/utils/hierarchyUtils";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TaskTableProps {
  tasks: ProjectTask[];
  onTaskMove: (taskId: string, newHierarchyNumber: string, newOrderIndex: number) => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

export function TaskTable({ tasks, onTaskMove, onTaskUpdate }: TaskTableProps) {
  const [draggedTask, setDraggedTask] = useState<ProjectTask | null>(null);

  const handleDragStart = (e: React.DragEvent, task: ProjectTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    // Calculate new hierarchy number based on position
    const newHierarchyNumber = generateHierarchyNumber(tasks, targetIndex);
    
    onTaskMove(draggedTask.id, newHierarchyNumber, targetIndex);
    setDraggedTask(null);
  };

  // Sort tasks by hierarchy number for display
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  return (
    <div className="h-[600px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="w-20 text-xs py-1 px-2">#</TableHead>
            <TableHead className="w-48 text-xs py-1 px-2">Task Name</TableHead>
            <TableHead className="w-24 text-xs py-1 px-2">Start Date</TableHead>
            <TableHead className="w-24 text-xs py-1 px-2">End Date</TableHead>
            <TableHead className="w-20 text-xs py-1 px-2">Duration</TableHead>
            <TableHead className="w-20 text-xs py-1 px-2">Progress</TableHead>
            <TableHead className="w-32 text-xs py-1 px-2">Resources</TableHead>
            <TableHead className="w-8 text-xs py-1 px-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTaskUpdate={onTaskUpdate}
              isDragging={draggedTask?.id === task.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}