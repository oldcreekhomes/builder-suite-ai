
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TableCell, TableRow } from "@/components/ui/table";
import { Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { EditableCell } from "./EditableCell";
import { getTaskNumber } from "./utils/ganttUtils";

interface TaskRowProps {
  task: ScheduleTask;
  isChild?: boolean;
  isParent?: boolean;
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onEditTask: (task: ScheduleTask) => void;
  onDeleteTask: (taskId: string) => void;
  allTasks: ScheduleTask[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  hasChildren?: boolean;
}

export function TaskRow({
  task,
  isChild = false,
  isParent = false,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onEditTask,
  onDeleteTask,
  allTasks,
  isCollapsed = false,
  onToggleCollapse,
  hasChildren = false,
}: TaskRowProps) {
  const endDate = parseISO(task.end_date);

  const renderEditableCell = (field: string, value: string | number, type: "text" | "date" | "number" | "select" = "text") => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;
    
    return (
      <EditableCell
        task={task}
        field={field}
        value={value}
        type={type}
        isEditing={isEditing}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
      />
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return "bg-slate-200";
    if (progress < 50) return "bg-yellow-500";
    if (progress < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <TableRow className={`
      ${isChild ? 'bg-slate-50/50' : 'bg-white'} 
      hover:bg-slate-50 
      transition-colors 
      border-b border-slate-100
      h-4
    `}>
      <TableCell className={`${isChild ? 'pl-8' : 'pl-4'} font-mono text-xs text-slate-600 py-0.5`}>
        <div className="flex items-center">
          {!isChild && hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-2 hover:bg-slate-200"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
          <span className={`
            px-2 py-0.5 rounded text-xs font-medium
            ${isChild ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}
          `}>
            {getTaskNumber(task.task_code)}
          </span>
        </div>
      </TableCell>
      
      <TableCell className="py-0.5 min-w-[180px] pr-1">
        <div className={`text-sm ${isChild ? 'text-slate-700 pl-4' : isParent ? 'text-slate-900 font-bold' : 'text-slate-900'}`}>
          {renderEditableCell('task_name', task.task_name)}
        </div>
      </TableCell>
      
      <TableCell className="py-0.5 w-20 pl-1">
        <div className="text-xs text-slate-600 font-mono">
          {renderEditableCell('start_date', task.start_date, 'date')}
        </div>
      </TableCell>
      
      <TableCell className="py-0.5 w-16">
        <div className="flex items-center space-x-1">
          {renderEditableCell('duration', task.duration, 'number')}
        </div>
      </TableCell>
      
      <TableCell className="py-0.5 w-20">
        <div className="text-xs text-slate-600 font-mono">
          {format(endDate, 'MMM dd, yyyy')}
        </div>
      </TableCell>
      
      <TableCell className="py-0.5 w-16">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Progress 
              value={task.progress} 
              className={`h-2 ${getProgressColor(task.progress)}`}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 w-8">
            {task.progress}%
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
