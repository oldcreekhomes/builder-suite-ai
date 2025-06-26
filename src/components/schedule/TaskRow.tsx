
import { TableRow } from "@/components/ui/table";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { ColumnType } from "./types";
import { TaskCellFactory } from "./components/TaskCellFactory";
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
  columnType: ColumnType;
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
  columnType,
}: TaskRowProps) {
  return (
    <TableRow className={getTaskRowClassName(isChild)}>
      <TaskCellFactory
        task={task}
        columnType={columnType}
        isChild={isChild}
        isParent={isParent}
        editingCell={editingCell}
        editValue={editValue}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        allTasks={allTasks}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        hasChildren={hasChildren}
        isSelected={isSelected}
        onSelectTask={onSelectTask}
      />
    </TableRow>
  );
}
