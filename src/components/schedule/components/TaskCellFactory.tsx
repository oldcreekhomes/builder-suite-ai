
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { ColumnType } from "../types";
import { CheckboxCell } from "./CheckboxCell";
import { CodeCell } from "./CodeCell";
import { NameCell } from "./NameCell";
import { DateCell } from "./DateCell";
import { DurationCell } from "./DurationCell";
import { ProgressCell } from "./ProgressCell";
import { ResourcesCell } from "./ResourcesCell";
import { PredecessorsCell } from "./PredecessorsCell";

interface TaskCellFactoryProps {
  task: ScheduleTask;
  columnType: ColumnType;
  isChild?: boolean;
  isParent?: boolean;
  editingCell: { taskId: string; field: string } | null;
  editValue: string;
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  allTasks: ScheduleTask[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  hasChildren?: boolean;
  isSelected: boolean;
  onSelectTask: (taskId: string, checked: boolean) => void;
}

export function TaskCellFactory({
  task,
  columnType,
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
}: TaskCellFactoryProps) {
  switch (columnType) {
    case "checkbox":
      return (
        <CheckboxCell
          isSelected={isSelected}
          onSelectTask={onSelectTask}
          taskId={task.id}
        />
      );
    case "code":
      return (
        <CodeCell
          taskCode={task.task_code}
          isChild={isChild}
          hasChildren={hasChildren}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      );
    case "name":
      return (
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
      );
    case "startDate":
      return (
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
      );
    case "duration":
      return (
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
      );
    case "endDate":
      return (
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
      );
    case "progress":
      return <ProgressCell progress={task.progress} />;
    case "resources":
      return (
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
      );
    case "predecessors":
      return (
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
      );
    default:
      return null;
  }
}
