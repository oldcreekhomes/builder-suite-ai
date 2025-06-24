
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody } from "@/components/ui/table";
import { ScheduleTask } from "@/hooks/useProjectSchedule";
import { TaskRow } from "./TaskRow";
import { NewTaskRow } from "./NewTaskRow";
import { GanttHeader } from "./GanttHeader";

interface NewTask {
  task_name: string;
  start_date: string;
  duration: number;
  resources: string;
  predecessor_id?: string;
}

interface EditingCell {
  taskId: string;
  field: string;
}

interface GanttTableProps {
  tasks: ScheduleTask[];
  parentTasks: ScheduleTask[];
  collapsedSections: Set<string>;
  editingCell: EditingCell | null;
  editValue: string;
  isAddingTask: boolean;
  newTask: NewTask;
  getChildTasks: (parentId: string) => ScheduleTask[];
  onStartEditing: (taskId: string, field: string, currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onEditTask: (task: ScheduleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleSection: (taskId: string) => void;
  onNewTaskChange: (newTask: NewTask) => void;
  onSaveNewTask: () => void;
  onCancelNewTask: () => void;
}

export function GanttTable({
  tasks,
  parentTasks,
  collapsedSections,
  editingCell,
  editValue,
  isAddingTask,
  newTask,
  getChildTasks,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onEditTask,
  onDeleteTask,
  onToggleSection,
  onNewTaskChange,
  onSaveNewTask,
  onCancelNewTask,
}: GanttTableProps) {
  return (
    <div className="h-full">
      <ScrollArea className="h-[500px]">
        <Table>
          <GanttHeader />
          <TableBody>
            {parentTasks.map(task => (
              <React.Fragment key={task.id}>
                <TaskRow
                  task={task}
                  editingCell={editingCell}
                  editValue={editValue}
                  onStartEditing={onStartEditing}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onEditValueChange={onEditValueChange}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  allTasks={tasks}
                  isCollapsed={collapsedSections.has(task.id)}
                  onToggleCollapse={() => onToggleSection(task.id)}
                  hasChildren={getChildTasks(task.id).length > 0}
                  isParent={true}
                />
                {!collapsedSections.has(task.id) && getChildTasks(task.id).map(childTask => 
                  <TaskRow
                    key={childTask.id}
                    task={childTask}
                    isChild={true}
                    editingCell={editingCell}
                    editValue={editValue}
                    onStartEditing={onStartEditing}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    onEditValueChange={onEditValueChange}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    allTasks={tasks}
                  />
                )}
              </React.Fragment>
            ))}
            {isAddingTask && (
              <NewTaskRow
                key="new-task"
                newTask={newTask}
                tasks={tasks}
                onNewTaskChange={onNewTaskChange}
                onSaveNewTask={onSaveNewTask}
                onCancelNewTask={onCancelNewTask}
              />
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
