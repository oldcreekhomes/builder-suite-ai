
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
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
  isSelected: boolean;
  onSelectTask: (taskId: string, checked: boolean) => void;
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
  allTasks,
  isCollapsed = false,
  onToggleCollapse,
  hasChildren = false,
  isSelected,
  onSelectTask,
}: TaskRowProps) {
  const getTaskRowClassName = (isChild: boolean) => `
    ${isChild ? 'bg-slate-50/50' : 'bg-white'} 
    hover:bg-slate-50 
    transition-colors 
    border-b border-slate-100
    h-8
  `;

  const getTaskNameClassName = (isChild: boolean, isParent: boolean) => 
    `text-sm ${isChild ? 'text-slate-700 pl-4' : isParent ? 'text-slate-900 font-bold' : 'text-slate-900'}`;

  const getProgressColor = (progress: number) => {
    if (progress === 0) return "bg-slate-200";
    if (progress < 50) return "bg-yellow-500";
    if (progress < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <TableRow className={getTaskRowClassName(isChild)}>
      {/* Checkbox */}
      <TableCell className="py-1 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectTask(task.id, checked as boolean)}
          className="h-3 w-3"
        />
      </TableCell>

      {/* Code */}
      <TableCell className="font-mono text-xs text-slate-600 py-1 relative w-16">
        <div className="flex items-center">
          {!isChild && hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-3 w-3 p-0 mr-1 hover:bg-slate-200 absolute left-0"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? (
                <ChevronRight className="h-2 w-2" />
              ) : (
                <ChevronDown className="h-2 w-2" />
              )}
            </Button>
          )}
          <span className="px-1 py-0.25 rounded text-xs font-medium ml-4 text-black">
            {getTaskNumber(task.task_code)}
          </span>
        </div>
      </TableCell>

      {/* Name */}
      <TableCell className="py-1 min-w-[200px]">
        <div className={getTaskNameClassName(isChild, isParent)}>
          <EditableCell
            task={task}
            field="task_name"
            value={task.task_name}
            type="text"
            isEditing={editingCell?.taskId === task.id && editingCell?.field === 'task_name'}
            editValue={editValue}
            onStartEditing={onStartEditing}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditValueChange={onEditValueChange}
            allTasks={allTasks}
          />
        </div>
      </TableCell>

      {/* Start Date */}
      <TableCell className="py-1 w-28">
        <div className="text-xs text-slate-600 font-mono">
          <EditableCell
            task={task}
            field="start_date"
            value={task.start_date}
            type="date"
            isEditing={editingCell?.taskId === task.id && editingCell?.field === 'start_date'}
            editValue={editValue}
            onStartEditing={onStartEditing}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditValueChange={onEditValueChange}
            allTasks={allTasks}
          />
        </div>
      </TableCell>

      {/* Duration */}
      <TableCell className="py-1 w-20">
        <div className="flex items-center space-x-1">
          <EditableCell
            task={task}
            field="duration"
            value={task.duration}
            type="number"
            isEditing={editingCell?.taskId === task.id && editingCell?.field === 'duration'}
            editValue={editValue}
            onStartEditing={onStartEditing}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditValueChange={onEditValueChange}
            allTasks={allTasks}
          />
        </div>
      </TableCell>

      {/* End Date */}
      <TableCell className="py-1 w-28">
        <div className="text-xs text-slate-600 font-mono">
          {format(parseISO(task.end_date), 'MMM dd')}
        </div>
      </TableCell>

      {/* Progress */}
      <TableCell className="py-1 w-24">
        <div className="flex items-center space-x-2">
          <Progress 
            value={task.progress} 
            className={`w-10 h-2 ${getProgressColor(task.progress)}`}
          />
          <span className="text-slate-500 text-sm font-medium w-8">
            {task.progress}%
          </span>
        </div>
      </TableCell>

      {/* Resources */}
      <TableCell className="py-1 w-32">
        <div className="text-xs text-slate-600">
          <EditableCell
            task={task}
            field="resources"
            value={task.resources?.join(', ') || ''}
            type="text"
            isEditing={editingCell?.taskId === task.id && editingCell?.field === 'resources'}
            editValue={editValue}
            onStartEditing={onStartEditing}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditValueChange={onEditValueChange}
            allTasks={allTasks}
          />
        </div>
      </TableCell>

      {/* Predecessors */}
      <TableCell className="py-1 w-28">
        <div className="text-xs text-slate-600">
          <EditableCell
            task={task}
            field="predecessor_id"
            value={task.predecessor_id || ''}
            type="select"
            isEditing={editingCell?.taskId === task.id && editingCell?.field === 'predecessor_id'}
            editValue={editValue}
            onStartEditing={onStartEditing}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditValueChange={onEditValueChange}
            allTasks={allTasks}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
