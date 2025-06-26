
import { format, parseISO } from "date-fns";
import { TableCell } from "@/components/ui/table";
import { EditableCell } from "../EditableCell";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface DateCellProps {
  task: ScheduleTask;
  field: 'start_date' | 'end_date';
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
  isEditable?: boolean;
}

export function DateCell({
  task,
  field,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  allTasks,
  isEditable = true,
}: DateCellProps) {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;
  const date = parseISO(task[field]);

  return (
    <TableCell className="py-1 w-20 pl-1">
      <div className="text-xs text-slate-600 font-mono">
        {isEditable ? (
          <EditableCell
            task={task}
            field={field}
            value={task[field]}
            type="date"
            isEditing={isEditing}
            editValue={editValue}
            onStartEditing={onStartEditing}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditValueChange={onEditValueChange}
            allTasks={allTasks}
          />
        ) : (
          format(date, 'MMM dd')
        )}
      </div>
    </TableCell>
  );
}
