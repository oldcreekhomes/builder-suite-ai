
import { TableRow } from "@/components/ui/table";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { CheckboxCell } from "./components/CheckboxCell";
import { CodeCell } from "./components/CodeCell";
import { NameCell } from "./components/NameCell";
import { DateCell } from "./components/DateCell";
import { DurationCell } from "./components/DurationCell";
import { ProgressCell } from "./components/ProgressCell";
import { ResourcesCell } from "./components/ResourcesCell";
import { PredecessorsCell } from "./components/PredecessorsCell";
import { getTaskRowClassName } from "./components/TaskRowStyles";

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
  return (
    <TableRow className={getTaskRowClassName(isChild)}>
      <CheckboxCell
        isSelected={isSelected}
        onSelectTask={onSelectTask}
        taskId={task.id}
      />
      <CodeCell
        taskCode={task.task_code}
        isChild={isChild}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <NameCell
        task={task}
        isChild={isChild}
        isParent={isParent}
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
      />
      <DateCell
        task={task}
        field="start_date"
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
      />
      <DurationCell
        task={task}
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
      />
      <DateCell
        task={task}
        field="end_date"
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
        isEditable={false}
      />
      <ProgressCell progress={task.progress} />
      <ResourcesCell
        task={task}
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
      />
      <PredecessorsCell
        task={task}
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
      />
    </TableRow>
  );
}
