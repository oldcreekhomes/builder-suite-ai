
import { TableCell } from "@/components/ui/table";
import { EditableCell } from "../EditableCell";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { getTaskNameClassName } from "./TaskRowStyles";

interface NameCellProps {
  task: ScheduleTask;
  isChild: boolean;
  isParent: boolean;
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
}

export function NameCell({
  task,
  isChild,
  isParent,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  allTasks,
}: NameCellProps) {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'task_name';

  return (
    <TableCell className="py-1 min-w-[180px] pr-1">
      <div className={getTaskNameClassName(isChild, isParent)}>
        <EditableCell
          task={task}
          field="task_name"
          value={task.task_name}
          type="text"
          isEditing={isEditing}
          editValue={editValue}
          onStartEditing={onStartEditing}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onEditValueChange={onEditValueChange}
          allTasks={allTasks}
        />
      </div>
    </TableCell>
  );
}
