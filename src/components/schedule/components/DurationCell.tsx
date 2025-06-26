
import { TableCell } from "@/components/ui/table";
import { EditableCell } from "../EditableCell";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface DurationCellProps {
  task: ScheduleTask;
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
}

export function DurationCell({
  task,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  allTasks,
}: DurationCellProps) {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'duration';

  return (
    <TableCell className="py-1 w-16">
      <div className="flex items-center space-x-1">
        <EditableCell
          task={task}
          field="duration"
          value={task.duration}
          type="number"
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
