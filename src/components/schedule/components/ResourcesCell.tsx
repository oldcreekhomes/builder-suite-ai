
import { TableCell } from "@/components/ui/table";
import { EditableCell } from "../EditableCell";
import { ScheduleTask } from "@/hooks/useProjectSchedule";

interface ResourcesCellProps {
  task: ScheduleTask;
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
}

export function ResourcesCell({
  task,
  editingCell,
  editValue,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  allTasks,
}: ResourcesCellProps) {
  const isEditing = editingCell?.taskId === task.id && editingCell?.field === 'resources';

  return (
    <TableCell className="py-1 w-32">
      <div className="text-xs text-slate-600">
        <EditableCell
          task={task}
          field="resources"
          value={task.resources?.join(', ') || ''}
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
