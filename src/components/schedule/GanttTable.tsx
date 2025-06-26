
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScheduleTask, useUpdateScheduleTask } from "@/hooks/useProjectSchedule";
import { TaskRow } from "./TaskRow";
import { NewTaskRow } from "./NewTaskRow";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays } from "date-fns";

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
  const isAllSelected = allTaskIds.length > 0 && selectedTasks.size === allTaskIds.length;

  return (
    <div className="h-full">
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow className="h-8 bg-slate-50 border-b border-slate-200">
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  className="h-3 w-3"
                />
              </TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-16">Code</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center min-w-[200px]">Name</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-28">Start Date</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-20">Duration</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-28">End Date</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-24">Progress</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-32">Resources</TableHead>
              <TableHead className="py-0.5 text-xs font-bold text-slate-700 text-center w-28">Predecessors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
