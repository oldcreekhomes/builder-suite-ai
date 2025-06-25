
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody } from "@/components/ui/table";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
  selectedTasks: Set<string>;
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
  onSelectTask: (taskId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export function GanttTable({
  tasks,
  parentTasks,
  collapsedSections,
  editingCell,
  editValue,
  isAddingTask,
  newTask,
  selectedTasks,
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
  onSelectTask,
  onSelectAll,
}: GanttTableProps) {
  const allTaskIds = tasks.map(task => task.id);

  return (
    <div className="h-full">
      <ScrollArea className="h-[500px]">
        <ResizablePanelGroup direction="horizontal" className="min-h-full">
          <ResizablePanel defaultSize={5} minSize={3} maxSize={8}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="checkbox"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="checkbox"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="checkbox"
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
                    columnType="checkbox"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={10} minSize={8} maxSize={15}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="code"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="code"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="code"
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
                    columnType="code"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="name"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="name"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="name"
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
                    columnType="name"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="startDate"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="startDate"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="startDate"
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
                    columnType="startDate"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={10} minSize={8} maxSize={15}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="duration"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="duration"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="duration"
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
                    columnType="duration"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="endDate"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="endDate"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="endDate"
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
                    columnType="endDate"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="progress"
              />
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
                      isSelected={selectedTasks.has(task.id)}
                      onSelectTask={onSelectTask}
                      columnType="progress"
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
                        isSelected={selectedTasks.has(childTask.id)}
                        onSelectTask={onSelectTask}
                        columnType="progress"
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
                    columnType="progress"
                  />
                )}
              </TableBody>
            </Table>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ScrollArea>
    </div>
  );
}
