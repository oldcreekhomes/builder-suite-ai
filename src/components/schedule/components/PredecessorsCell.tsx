
import { TableCell } from "@/components/ui/table";
import { EditableCell } from "../EditableCell";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface PredecessorsCellProps {
  task: ScheduleTask;
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
}

export function PredecessorsCell({
  task,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  allTasks,
}: PredecessorsCellProps) {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'predecessor_id';

  return (
    <TableCell className="py-1 w-24">
      <div className="text-xs text-slate-600">
        <EditableCell
          task={task}
          field="predecessor_id"
          value={task.predecessor_id || ''}
          type="select"
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
