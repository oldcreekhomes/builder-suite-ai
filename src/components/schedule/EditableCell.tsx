
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { getTaskNumber, formatTaskDate } from "./utils/ganttUtils";

interface EditableCellProps {
  task: ScheduleTask;
  field: string;
  value: string | number;
  type?: "text" | "date" | "number" | "select";
  isEditing: boolean;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
}

export function EditableCell({
  task,
  field,
  value,
  type = "text",
  isEditing,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  allTasks,
}: EditableCellProps) {
  if (isEditing) {
    if (type === "select" && field === "predecessor_id") {
      return (
        <div className="flex items-center space-x-1 min-w-0">
          <Select value={editValue} onValueChange={onEditValueChange}>
            <SelectTrigger className="h-6 text-xs min-w-[60px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {allTasks.filter(t => t.id !== task.id).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {getTaskNumber(t.task_code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    if (field === 'duration') {
      return (
        <div className="flex items-center space-x-1 min-w-0">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="h-6 text-xs w-12 flex-shrink-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            autoFocus
          />
          <span className="text-xs flex-shrink-0">d</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    if (field === 'progress') {
      return (
        <div className="flex items-center space-x-1 min-w-0">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="h-6 text-xs w-12 flex-shrink-0"
            min="0"
            max="100"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            autoFocus
          />
          <span className="text-xs flex-shrink-0">%</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-1 min-w-0">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="h-6 text-xs min-w-0 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          autoFocus
        />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onSaveEdit}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={onCancelEdit}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer hover:bg-gray-100 p-1 rounded min-w-0 truncate"
      onClick={() => onStartEditing(task.id, field, value)}
    >
      {field === "predecessor_id" && value ? (
        <Badge variant="outline" className="text-xs px-1 py-0">
          {getTaskNumber(allTasks.find(t => t.id === value)?.task_code || '0')}
        </Badge>
      ) : field === "predecessor_id" && !value ? (
        <span className="text-gray-400 text-xs">None</span>
      ) : field === "start_date" || field === "end_date" ? (
        <span className="whitespace-nowrap">{formatTaskDate(value as string)}</span>
      ) : field === "duration" ? (
        <span>{value}d</span>
      ) : field === "progress" ? (
        <span>{value}%</span>
      ) : (
        value
      )}
    </div>
  );
}
