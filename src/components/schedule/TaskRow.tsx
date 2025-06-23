
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Edit, Users, Trash2 } from "lucide-react";
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
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onEditTask: (task: ScheduleTask) => void;
  onDeleteTask: (taskId: string) => void;
  allTasks: ScheduleTask[];
}

export function TaskRow({
  task,
  isChild = false,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onEditTask,
  onDeleteTask,
  allTasks,
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

  return (
    <TableRow className={`${isChild ? 'bg-gray-50' : ''} h-10`}>
      <TableCell className={`${isChild ? 'pl-8' : 'pl-4'} font-medium py-1 text-xs w-16`}>
        {getTaskNumber(task.task_code)}
      </TableCell>
      <TableCell className="py-1 text-xs min-w-[120px] max-w-[150px]">
        {renderEditableCell('task_name', task.task_name)}
      </TableCell>
      <TableCell className="py-1 text-xs w-20">
        {renderEditableCell('start_date', task.start_date, 'date')}
      </TableCell>
      <TableCell className="py-1 text-xs w-16">
        {renderEditableCell('duration', task.duration, 'number')}
      </TableCell>
      <TableCell className="py-1 text-xs w-20">
        <span className="whitespace-nowrap">{format(endDate, 'MMM dd')}</span>
      </TableCell>
      <TableCell className="py-1 w-24">
        <div className="flex items-center space-x-2">
          <Progress value={task.progress} className="w-8 h-1 flex-shrink-0" />
          <div className="w-12 flex-shrink-0">
            {renderEditableCell('progress', task.progress, 'number')}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-1 w-20">
        {task.resources.length > 0 ? (
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 flex-shrink-0" />
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {task.resources.length}
            </Badge>
          </div>
        ) : (
          renderEditableCell('resources', task.resources.join(', '))
        )}
      </TableCell>
      <TableCell className="py-1 w-20">
        {renderEditableCell('predecessor_id', task.predecessor_id || '', 'select')}
      </TableCell>
      <TableCell className="py-1 w-20">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => onEditTask(task)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{task.task_name}"? This action is permanent and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDeleteTask(task.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
