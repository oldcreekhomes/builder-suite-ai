import { useState } from "react";
import { format, parseISO, eachDayOfInterval, isSameDay, differenceInDays, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Edit, Users, Check, X } from "lucide-react";
import { ScheduleTask, useUpdateScheduleTask, useAddScheduleTask } from "@/hooks/useProjectSchedule";
import { EditTaskDialog } from "./EditTaskDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
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

  const handleAddNewTask = () => {
    const nextTaskNumber = tasks.length + 1;
    const taskCode = String(nextTaskNumber).padStart(3, '0');
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

  const renderEditableCell = (task: ScheduleTask, field: string, value: string | number, type: "text" | "date" | "number" | "select" = "text") => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;
    
    if (isEditing) {
      if (type === "select" && field === "predecessor_id") {
        return (
          <div className="flex items-center space-x-1">
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {tasks.filter(t => t.id !== task.id).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.task_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveEdit}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      }
      
      return (
        <div className="flex items-center space-x-1">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-6 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
        onClick={() => startEditing(task.id, field, value)}
      >
        {field === "predecessor_id" && value ? (
          <Badge variant="outline" className="text-xs px-1 py-0">
            {tasks.find(t => t.id === value)?.task_code || 'Unknown'}
          </Badge>
        ) : field === "predecessor_id" && !value ? (
          <span className="text-gray-400 text-xs">None</span>
        ) : field === "start_date" || field === "end_date" ? (
          format(parseISO(value as string), 'MMM dd')
        ) : (
          value
        )}
      </div>
    );
  };

  const renderTaskRow = (task: ScheduleTask, isChild = false) => {
    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);

    return (
      <TableRow key={task.id} className={`${isChild ? 'bg-gray-50' : ''} h-8`}>
        <TableCell className={`${isChild ? 'pl-8' : 'pl-4'} font-medium py-1 text-xs`}>
          {task.task_code}
        </TableCell>
        <TableCell className="py-1 text-xs max-w-[150px]">
          {renderEditableCell(task, 'task_name', task.task_name)}
        </TableCell>
        <TableCell className="py-1 text-xs">
          {renderEditableCell(task, 'start_date', task.start_date, 'date')}
        </TableCell>
        <TableCell className="py-1 text-xs">
          {format(endDate, 'MMM dd')}
        </TableCell>
        <TableCell className="py-1 text-xs">
          {renderEditableCell(task, 'duration', task.duration, 'number')}d
        </TableCell>
        <TableCell className="py-1">
          <div className="flex items-center space-x-2">
            <Progress value={task.progress} className="w-8 h-1" />
            <div className="w-8">
              {renderEditableCell(task, 'progress', task.progress, 'number')}%
            </div>
          </div>
        </TableCell>
        <TableCell className="py-1">
          {task.resources.length > 0 ? (
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {task.resources.length}
              </Badge>
            </div>
          ) : (
            renderEditableCell(task, 'resources', task.resources.join(', '))
          )}
        </TableCell>
        <TableCell className="py-1">
          {renderEditableCell(task, 'predecessor_id', task.predecessor_id || '', 'select')}
        </TableCell>
        <TableCell className="py-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setEditingTask(task)}
          >
            <Edit className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const renderNewTaskRow = () => {
    if (!isAddingTask) return null;

    const nextTaskCode = String(tasks.length + 1).padStart(3, '0');

    return (
      <TableRow className="bg-blue-50 h-8">
        <TableCell className="pl-4 font-medium py-1 text-xs">
          {nextTaskCode}
        </TableCell>
        <TableCell className="py-1 text-xs">
          <Input
            value={newTask.task_name}
            onChange={(e) => setNewTask({...newTask, task_name: e.target.value})}
            placeholder="Task name"
            className="h-6 text-xs"
          />
        </TableCell>
        <TableCell className="py-1 text-xs">
          <Input
            type="date"
            value={newTask.start_date}
            onChange={(e) => setNewTask({...newTask, start_date: e.target.value})}
            className="h-6 text-xs"
          />
        </TableCell>
        <TableCell className="py-1 text-xs">
          {format(addDays(new Date(newTask.start_date), newTask.duration - 1), 'MMM dd')}
        </TableCell>
        <TableCell className="py-1 text-xs">
          <Input
            type="number"
            value={newTask.duration}
            onChange={(e) => setNewTask({...newTask, duration: parseInt(e.target.value) || 1})}
            className="h-6 text-xs w-12"
            min="1"
          />d
        </TableCell>
        <TableCell className="py-1">
          <div className="flex items-center space-x-2">
            <Progress value={0} className="w-8 h-1" />
            <span className="text-xs w-8">0%</span>
          </div>
        </TableCell>
        <TableCell className="py-1">
          <Input
            value={newTask.resources}
            onChange={(e) => setNewTask({...newTask, resources: e.target.value})}
            placeholder="emails"
            className="h-6 text-xs"
          />
        </TableCell>
        <TableCell className="py-1">
          <Select 
            value={newTask.predecessor_id || "none"} 
            onValueChange={(value) => setNewTask({...newTask, predecessor_id: value === "none" ? undefined : value})}
          >
            <SelectTrigger className="h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.task_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-1">
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveNewTask}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelNewTask}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Render Gantt chart rows
  const renderGanttRow = (task: ScheduleTask, isChild = false) => {
    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);
    const taskStartIndex = dateRange.findIndex(date => isSameDay(date, startDate));
    const taskDuration = differenceInDays(endDate, startDate) + 1;
    
    return (
      <div key={task.id} className={`mb-1 ${isChild ? 'ml-4' : ''}`}>
        <div className="flex items-center h-8">
          <div className="w-48 flex-shrink-0 text-xs font-medium pr-4 truncate">
            {isChild ? '↳ ' : ''}{task.task_name}
          </div>
          <div className="flex relative">
            {dateRange.map((_, index) => (
              <div
                key={index}
                className={`w-8 ${isChild ? 'h-3' : 'h-4'} border-r border-gray-200`}
              >
                {index >= taskStartIndex && index < taskStartIndex + taskDuration && (
                  <div 
                    className={`h-full rounded ${isChild ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{
                      background: `linear-gradient(to right, ${isChild ? '#10b981' : '#3b82f6'} ${task.progress}%, #e5e7eb ${task.progress}%)`
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
                  <TableRow className="h-6">
                    <TableHead className="py-1 text-xs">Code</TableHead>
                    <TableHead className="py-1 text-xs">Task Name</TableHead>
                    <TableHead className="py-1 text-xs">Start</TableHead>
                    <TableHead className="py-1 text-xs">End</TableHead>
                    <TableHead className="py-1 text-xs">Duration</TableHead>
                    <TableHead className="py-1 text-xs">Progress</TableHead>
                    <TableHead className="py-1 text-xs">Resources</TableHead>
                    <TableHead className="py-1 text-xs">Predecessor</TableHead>
                    <TableHead className="py-1 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentTasks.map(task => (
                    <>
                      {renderTaskRow(task)}
                      {getChildTasks(task.id).map(childTask => 
                        renderTaskRow(childTask, true)
                      )}
                    </>
                  ))}
                  {renderNewTaskRow()}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <Card className="h-full border-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3">
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    <div className="flex mb-2">
                      <div className="w-48 flex-shrink-0"></div>
                      {dateRange.map((date, index) => (
                        <div
                          key={index}
                          className="w-8 text-xs text-center border-r border-gray-200 p-1"
                        >
                          {format(date, 'dd')}
                        </div>
                      ))}
                    </div>
                    
                    {parentTasks.map(task => (
                      <div key={task.id}>
                        {renderGanttRow(task)}
                        {getChildTasks(task.id).map(childTask => 
                          renderGanttRow(childTask, true)
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
