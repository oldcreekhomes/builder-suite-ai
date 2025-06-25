
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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  if (isEditing) {
    if (type === "select" && field === "predecessor_id") {
      return (
        <div className="flex items-center space-x-1 min-w-0">
          <Select value={editValue} onValueChange={onEditValueChange}>
            <SelectTrigger className="h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm min-w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 shadow-lg">
              <SelectItem value="none" className="text-sm">None</SelectItem>
              {allTasks.filter(t => t.id !== task.id).map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">
                  Task {getTaskNumber(t.task_code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 transition-colors flex-shrink-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0" onClick={onCancelEdit}>
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
            className="h-8 text-sm w-14 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm flex-shrink-0"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <span className="text-slate-500 text-sm font-medium flex-shrink-0">d</span>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 transition-colors flex-shrink-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0" onClick={onCancelEdit}>
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
            className="h-8 text-sm w-14 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm flex-shrink-0"
            min="0"
            max="100"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <span className="text-slate-500 text-sm font-medium flex-shrink-0">%</span>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 transition-colors flex-shrink-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-1 min-w-0 ml-4">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm min-w-0 flex-1"
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 transition-colors flex-shrink-0" onClick={onSaveEdit}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0" onClick={onCancelEdit}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer hover:bg-slate-50 p-2 rounded-md min-w-0 truncate transition-colors border border-transparent hover:border-slate-200 ml-4"
      onClick={() => onStartEditing(task.id, field, value)}
    >
      {field === "predecessor_id" && value ? (
        <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-600 border-blue-200">
          Task {getTaskNumber(allTasks.find(t => t.id === value)?.task_code || '0')}
        </Badge>
      ) : field === "predecessor_id" && !value ? (
        <span className="text-slate-400 text-sm">None</span>
      ) : field === "start_date" || field === "end_date" ? (
        <span className="whitespace-nowrap text-slate-700 font-medium">{formatTaskDate(value as string)}</span>
      ) : field === "duration" ? (
        <span className="text-slate-700 font-medium">{value}d</span>
      ) : field === "progress" ? (
        <span className="text-slate-700 font-medium">{value}%</span>
      ) : (
        <span className="text-slate-700">{value}</span>
      )}
    </div>
  );
}
