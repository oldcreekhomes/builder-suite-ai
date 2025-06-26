import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody } from "@/components/ui/table";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScheduleTask, useUpdateScheduleTask } from "@/hooks/useProjectSchedule";
import { TaskRow } from "./TaskRow";
import { NewTaskRow } from "./NewTaskRow";
import { GanttHeader } from "./GanttHeader";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays } from "date-fns";
import { ColumnType } from "./types";

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
  const updateTaskMutation = useUpdateScheduleTask();
  const { toast } = useToast();

  const handleInlineEdit = async (taskId: string, field: string, value: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      let updates: Partial<ScheduleTask> = {};
      
      switch (field) {
        case 'task_name':
          updates.task_name = value;
          break;
        case 'duration':
          const duration = parseInt(value);
          if (isNaN(duration) || duration <= 0) {
            toast({
              title: "Invalid Duration",
              description: "Duration must be a positive number",
              variant: "destructive",
            });
            return;
          }
          updates.duration = duration;
          // Recalculate end date
          const startDate = parseISO(task.start_date);
          const endDate = addDays(startDate, duration - 1);
          updates.end_date = format(endDate, 'yyyy-MM-dd');
          break;
        case 'progress':
          const progress = parseInt(value);
          if (isNaN(progress) || progress < 0 || progress > 100) {
            toast({
              title: "Invalid Progress",
              description: "Progress must be between 0 and 100",
              variant: "destructive",
            });
            return;
          }
          updates.progress = progress;
          break;
        case 'start_date':
          updates.start_date = value;
          // Recalculate end date
          const newStartDate = parseISO(value);
          const newEndDate = addDays(newStartDate, task.duration - 1);
          updates.end_date = format(newEndDate, 'yyyy-MM-dd');
          break;
        case 'predecessor_id':
          updates.predecessor_id = value === 'none' ? null : value;
          break;
        case 'resources':
          // Convert comma-separated string to array
          updates.resources = value.split(',').map(r => r.trim()).filter(r => r);
          break;
      }

      await updateTaskMutation.mutateAsync({ id: taskId, updates });
      onCancelEdit(); // Clear editing state after successful update
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const allTaskIds = tasks.map(task => task.id);

  const renderTaskRowsForColumn = (columnType: ColumnType) => {
    return (
      <>
        {parentTasks.map(task => (
          <React.Fragment key={task.id}>
            <TaskRow
              task={task}
              editingCell={editingCell}
              editValue={editValue}
              onStartEditing={onStartEditing}
              onSaveEdit={() => {
                if (editingCell) {
                  handleInlineEdit(editingCell.taskId, editingCell.field, editValue);
                }
              }}
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
              columnType={columnType}
            />
            {!collapsedSections.has(task.id) && getChildTasks(task.id).map(childTask => 
              <TaskRow
                key={childTask.id}
                task={childTask}
                isChild={true}
                editingCell={editingCell}
                editValue={editValue}
                onStartEditing={onStartEditing}
                onSaveEdit={() => {
                  if (editingCell) {
                    handleInlineEdit(editingCell.taskId, editingCell.field, editValue);
                  }
                }}
                onCancelEdit={onCancelEdit}
                onEditValueChange={onEditValueChange}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                allTasks={tasks}
                isSelected={selectedTasks.has(childTask.id)}
                onSelectTask={onSelectTask}
                columnType={columnType}
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
            columnType={columnType}
          />
        )}
      </>
    );
  };

  return (
    <div className="h-full">
      <ScrollArea className="h-[500px]">
        <ResizablePanelGroup direction="horizontal" className="min-h-full">
          <ResizablePanel defaultSize={3} minSize={2} maxSize={4}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="checkbox"
              />
              <TableBody>
                {renderTaskRowsForColumn("checkbox")}
              </TableBody>
            </Table>
          </ResizablePanel>
          
          <ResizableHandle />
          
          <ResizablePanel defaultSize={6} minSize={4} maxSize={8}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="code"
              />
              <TableBody>
                {renderTaskRowsForColumn("code")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={20} minSize={8} maxSize={40}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="name"
              />
              <TableBody>
                {renderTaskRowsForColumn("name")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={10} minSize={8} maxSize={15}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="startDate"
              />
              <TableBody>
                {renderTaskRowsForColumn("startDate")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={8} minSize={6} maxSize={12}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="duration"
              />
              <TableBody>
                {renderTaskRowsForColumn("duration")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={11} minSize={7} maxSize={15}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="endDate"
              />
              <TableBody>
                {renderTaskRowsForColumn("endDate")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={8} minSize={6} maxSize={12}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="progress"
              />
              <TableBody>
                {renderTaskRowsForColumn("progress")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="resources"
              />
              <TableBody>
                {renderTaskRowsForColumn("resources")}
              </TableBody>
            </Table>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={12} minSize={8} maxSize={18}>
            <Table>
              <GanttHeader 
                selectedTasks={selectedTasks}
                allTaskIds={allTaskIds}
                onSelectAll={onSelectAll}
                columnType="predecessors"
              />
              <TableBody>
                {renderTaskRowsForColumn("predecessors")}
              </TableBody>
            </Table>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ScrollArea>
    </div>
  );
}
