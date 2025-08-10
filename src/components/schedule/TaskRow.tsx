import React, { useState } from "react";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { GripVertical } from "lucide-react";
import { format } from "date-fns";

interface TaskRowProps {
  task: ProjectTask;
  index: number;
  onDragStart: (e: React.DragEvent, task: ProjectTask) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
  isDragging: boolean;
}

export function TaskRow({
  task,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onTaskUpdate,
  isDragging
}: TaskRowProps) {
  const { deleteTask } = useTaskMutations(task.project_id);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const handleCellClick = (field: string, value: any) => {
    setIsEditing(field);
    setEditValues({ [field]: value });
  };

  const handleSave = (field: string) => {
    if (editValues[field] !== undefined) {
      onTaskUpdate(task.id, { [field]: editValues[field] });
    }
    setIsEditing(null);
    setEditValues({});
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      handleSave(field);
    } else if (e.key === "Escape") {
      setIsEditing(null);
      setEditValues({});
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MM/dd/yy");
  };

  const getIndentLevel = (hierarchyNumber: string) => {
    const parts = hierarchyNumber.split(".");
    return Math.max(0, parts.length - 1);
  };

  const indentLevel = task.hierarchy_number ? getIndentLevel(task.hierarchy_number) : 0;

  return (
    <TableRow
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`cursor-move h-8 ${isDragging ? "opacity-50" : ""} hover:bg-muted/50`}
    >
      {/* Hierarchy Number */}
      <TableCell className="font-mono text-xs py-1 px-2">
        <div className="flex items-center gap-1">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          {task.hierarchy_number || "—"}
        </div>
      </TableCell>

      {/* Task Name with Indentation */}
      <TableCell className="py-1 px-2">
        <div 
          className="flex items-center gap-1"
          style={{ marginLeft: `${indentLevel * 16}px` }}
        >
          {isEditing === "task_name" ? (
            <Input
              value={editValues.task_name || ""}
              onChange={(e) => setEditValues({ ...editValues, task_name: e.target.value })}
              onBlur={() => handleSave("task_name")}
              onKeyDown={(e) => handleKeyDown(e, "task_name")}
              className="h-6 text-sm"
              autoFocus
            />
          ) : (
            <span
              onClick={() => handleCellClick("task_name", task.task_name)}
              className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs truncate"
              title={task.task_name}
            >
              {task.task_name}
            </span>
          )}
        </div>
      </TableCell>

      {/* Start Date */}
      <TableCell className="py-1 px-2">
        {isEditing === "start_date" ? (
          <Input
            type="date"
            value={editValues.start_date || task.start_date.split("T")[0]}
            onChange={(e) => setEditValues({ ...editValues, start_date: e.target.value })}
            onBlur={() => handleSave("start_date")}
            onKeyDown={(e) => handleKeyDown(e, "start_date")}
            className="h-6 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => handleCellClick("start_date", task.start_date.split("T")[0])}
            className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs"
          >
            {formatDate(task.start_date)}
          </span>
        )}
      </TableCell>

      {/* End Date */}
      <TableCell className="py-1 px-2">
        {isEditing === "end_date" ? (
          <Input
            type="date"
            value={editValues.end_date || task.end_date.split("T")[0]}
            onChange={(e) => setEditValues({ ...editValues, end_date: e.target.value })}
            onBlur={() => handleSave("end_date")}
            onKeyDown={(e) => handleKeyDown(e, "end_date")}
            className="h-6 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => handleCellClick("end_date", task.end_date.split("T")[0])}
            className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs"
          >
            {formatDate(task.end_date)}
          </span>
        )}
      </TableCell>

      {/* Duration */}
      <TableCell className="py-1 px-2">
        {isEditing === "duration" ? (
          <Input
            type="number"
            value={editValues.duration || task.duration}
            onChange={(e) => setEditValues({ ...editValues, duration: parseInt(e.target.value) })}
            onBlur={() => handleSave("duration")}
            onKeyDown={(e) => handleKeyDown(e, "duration")}
            className="h-6 w-12 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => handleCellClick("duration", task.duration)}
            className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs"
          >
            {task.duration}d
          </span>
        )}
      </TableCell>

      {/* Progress */}
      <TableCell className="py-1 px-2">
        {isEditing === "progress" ? (
          <Input
            type="number"
            min="0"
            max="100"
            value={editValues.progress || task.progress || 0}
            onChange={(e) => setEditValues({ ...editValues, progress: parseInt(e.target.value) })}
            onBlur={() => handleSave("progress")}
            onKeyDown={(e) => handleKeyDown(e, "progress")}
            className="h-6 w-12 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => handleCellClick("progress", task.progress || 0)}
            className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs"
          >
            {task.progress || 0}%
          </span>
        )}
      </TableCell>

      {/* Resources */}
      <TableCell className="py-1 px-2">
        {isEditing === "resources" ? (
          <Input
            value={editValues.resources || task.resources || ""}
            onChange={(e) => setEditValues({ ...editValues, resources: e.target.value })}
            onBlur={() => handleSave("resources")}
            onKeyDown={(e) => handleKeyDown(e, "resources")}
            className="h-6 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => handleCellClick("resources", task.resources || "")}
            className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 block text-xs"
          >
            {task.resources || "—"}
          </span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="py-1 px-2">
        <DeleteButton
          onDelete={async () => {
            await deleteTask.mutateAsync(task.id);
          }}
          title="Delete Task"
          description={`Are you sure you want to delete "${task.task_name}"? This action cannot be undone.`}
          size="icon"
          variant="ghost"
          showIcon={true}
          isLoading={deleteTask.isPending}
        />
      </TableCell>
    </TableRow>
  );
}