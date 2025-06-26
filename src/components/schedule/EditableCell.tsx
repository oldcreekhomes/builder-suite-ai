
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, X, CalendarIcon } from "lucide-react";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { getTaskNumber, formatTaskDate } from "./utils/ganttUtils";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onStartEditing(task.id, field, value);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onEditValueChange(format(date, 'yyyy-MM-dd'));
      setDatePopoverOpen(false);
      onSaveEdit();
    }
  };

  if (isEditing) {
    if (type === "select" && field === "predecessor_id") {
      return (
        <div className="flex items-center space-x-1 min-w-0">
          <Select value={editValue} onValueChange={onEditValueChange}>
            <SelectTrigger className="h-8 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm min-w-[80px]">
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

    if (type === "date") {
      return (
        <div className="flex items-center space-x-1 min-w-0">
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm min-w-[120px] justify-start text-left font-normal",
                  !editValue && "text-muted-foreground"
                )}
                onClick={() => setDatePopoverOpen(true)}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {editValue ? formatTaskDate(editValue) : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={editValue ? parseISO(editValue) : undefined}
                onSelect={handleDateSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
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
            className="h-8 text-sm w-14 border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm flex-shrink-0"
            onKeyDown={handleKeyDown}
            autoFocus
            min="1"
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
            className="h-8 text-sm w-14 border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm flex-shrink-0"
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
      <div className="flex items-center space-x-1 min-w-0">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="h-8 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm min-w-0 flex-1"
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
      className="cursor-pointer hover:bg-blue-50 hover:border-blue-200 p-2 rounded-md min-w-0 truncate transition-all duration-200 border border-transparent group"
      onClick={handleClick}
    >
      {field === "predecessor_id" && value ? (
        <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100">
          Task {getTaskNumber(allTasks.find(t => t.id === value)?.task_code || '0')}
        </Badge>
      ) : field === "predecessor_id" && !value ? (
        <span className="text-slate-400 text-sm group-hover:text-slate-600">Click to set</span>
      ) : field === "start_date" || field === "end_date" ? (
        <span className="whitespace-nowrap text-slate-700 font-medium group-hover:text-blue-700">{formatTaskDate(value as string)}</span>
      ) : field === "duration" ? (
        <span className="text-slate-700 font-medium group-hover:text-blue-700">{value}d</span>
      ) : field === "progress" ? (
        <span className="text-slate-700 font-medium group-hover:text-blue-700">{value}%</span>
      ) : (
        <span className="text-slate-700 group-hover:text-blue-700">{value}</span>
      )}
    </div>
  );
}
