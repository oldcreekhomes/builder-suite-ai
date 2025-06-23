import { useState } from "react";
import { format, parseISO, eachDayOfInterval, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScheduleTask, useUpdateScheduleTask, useAddScheduleTask, useDeleteScheduleTask } from "@/hooks/useProjectSchedule";
import { EditTaskDialog } from "./EditTaskDialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskRow } from "./TaskRow";
import { NewTaskRow } from "./NewTaskRow";
import { GanttVisualization } from "./GanttVisualization";
import { calculateEndDate } from "./utils/ganttUtils";

interface GanttChartProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
  projectId: string;
}

interface EditingCell {
  taskId: string;
  field: string;
}

interface NewTask {
  task_name: string;
  start_date: string;
  duration: number;
  resources: string;
  predecessor_id?: string;
}

export function GanttChart({ tasks, onTaskUpdate, projectId }: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    task_name: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    duration: 1,
    resources: "",
    predecessor_id: undefined,
  });

  const updateTaskMutation = useUpdateScheduleTask();
  const addTaskMutation = useAddScheduleTask();
  const deleteTaskMutation = useDeleteScheduleTask();

  const startEditing = (taskId: string, field: string, currentValue: string | number) => {
    setEditingCell({ taskId, field });
    setEditValue(String(currentValue));
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const task = tasks.find(t => t.id === editingCell.taskId);
    if (!task) return;

    const updates: Partial<ScheduleTask> = {};
    
    if (editingCell.field === 'task_name') {
      updates.task_name = editValue;
    } else if (editingCell.field === 'start_date') {
      const startDate = new Date(editValue);
      const endDate = addDays(startDate, task.duration - 1);
      updates.start_date = editValue;
      updates.end_date = format(endDate, "yyyy-MM-dd");
    } else if (editingCell.field === 'duration') {
      const duration = parseInt(editValue) || 1;
      const startDate = parseISO(task.start_date);
      const endDate = addDays(startDate, duration - 1);
      updates.duration = duration;
      updates.end_date = format(endDate, "yyyy-MM-dd");
    } else if (editingCell.field === 'progress') {
      updates.progress = Math.min(Math.max(parseInt(editValue) || 0, 0), 100);
    } else if (editingCell.field === 'resources') {
      const resourcesArray = editValue 
        ? editValue.split(',').map(r => r.trim()).filter(r => r.length > 0)
        : [];
      updates.resources = resourcesArray;
    } else if (editingCell.field === 'predecessor_id') {
      updates.predecessor_id = editValue === "none" ? undefined : editValue;
    }

    await updateTaskMutation.mutateAsync({ id: task.id, updates });
    setEditingCell(null);
    onTaskUpdate();
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
    onTaskUpdate();
  };

  const handleAddNewTask = () => {
    setNewTask({
      task_name: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      duration: 1,
      resources: "",
      predecessor_id: undefined,
    });
    setIsAddingTask(true);
  };

  const saveNewTask = async () => {
    if (!newTask.task_name.trim()) return;

    const nextTaskNumber = tasks.length + 1;
    const taskCode = String(nextTaskNumber).padStart(3, '0');
    const startDate = new Date(newTask.start_date);
    const endDate = addDays(startDate, newTask.duration - 1);
    
    const resourcesArray = newTask.resources 
      ? newTask.resources.split(',').map(r => r.trim()).filter(r => r.length > 0)
      : [];

    await addTaskMutation.mutateAsync({
      project_id: projectId,
      task_code: taskCode,
      task_name: newTask.task_name,
      start_date: newTask.start_date,
      end_date: format(endDate, "yyyy-MM-dd"),
      duration: newTask.duration,
      progress: 0,
      resources: resourcesArray,
      predecessor_id: newTask.predecessor_id === "none" ? undefined : newTask.predecessor_id,
    });

    setIsAddingTask(false);
    onTaskUpdate();
  };

  const cancelNewTask = () => {
    setIsAddingTask(false);
  };

  if (tasks.length === 0 && !isAddingTask) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-lg">No tasks yet</p>
        <Button onClick={handleAddNewTask} className="mt-4">
          Add Your First Task
        </Button>
      </div>
    );
  }

  // Calculate date range for the Gantt chart
  const allDates = tasks.flatMap(task => [
    parseISO(task.start_date),
    parseISO(task.end_date)
  ]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const dateRange = eachDayOfInterval({ start: minDate, end: maxDate });

  // Organize tasks by hierarchy (parents and children)
  const parentTasks = tasks.filter(task => !task.predecessor_id);
  const childTasks = tasks.filter(task => task.predecessor_id);

  const getChildTasks = (parentId: string) => {
    return childTasks.filter(task => task.predecessor_id === parentId);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div></div>
        <Button onClick={handleAddNewTask} size="sm">
          Add Task
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[400px] border rounded-lg">
        <ResizablePanel defaultSize={50} minSize={30}>
          <Card className="h-full border-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-1 text-xs w-16">#</TableHead>
                    <TableHead className="py-1 text-xs min-w-[120px]">Task Name</TableHead>
                    <TableHead className="py-1 text-xs w-20">Start Date</TableHead>
                    <TableHead className="py-1 text-xs w-16">Duration</TableHead>
                    <TableHead className="py-1 text-xs w-20">End Date</TableHead>
                    <TableHead className="py-1 text-xs w-24">Progress</TableHead>
                    <TableHead className="py-1 text-xs w-20">Resources</TableHead>
                    <TableHead className="py-1 text-xs w-20">Predecessor</TableHead>
                    <TableHead className="py-1 text-xs w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentTasks.map(task => (
                    <>
                      <TaskRow
                        key={task.id}
                        task={task}
                        editingCell={editingCell}
                        editValue={editValue}
                        onStartEditing={startEditing}
                        onSaveEdit={saveEdit}
                        onCancelEdit={cancelEdit}
                        onEditValueChange={setEditValue}
                        onEditTask={setEditingTask}
                        onDeleteTask={handleDeleteTask}
                        allTasks={tasks}
                      />
                      {getChildTasks(task.id).map(childTask => 
                        <TaskRow
                          key={childTask.id}
                          task={childTask}
                          isChild={true}
                          editingCell={editingCell}
                          editValue={editValue}
                          onStartEditing={startEditing}
                          onSaveEdit={saveEdit}
                          onCancelEdit={cancelEdit}
                          onEditValueChange={setEditValue}
                          onEditTask={setEditingTask}
                          onDeleteTask={handleDeleteTask}
                          allTasks={tasks}
                        />
                      )}
                    </>
                  ))}
                  {isAddingTask && (
                    <NewTaskRow
                      newTask={newTask}
                      tasks={tasks}
                      onNewTaskChange={setNewTask}
                      onSaveNewTask={saveNewTask}
                      onCancelNewTask={cancelNewTask}
                    />
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <Card className="h-full border-0">
            <ScrollArea className="h-[400px]">
              <GanttVisualization tasks={tasks} dateRange={dateRange} />
            </ScrollArea>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={() => setEditingTask(null)}
          onTaskUpdated={onTaskUpdate}
          allTasks={tasks}
        />
      )}
    </div>
  );
}
