
import React, { useState } from "react";
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
import { Plus, Edit, Trash2, Expand, FoldVertical, ZoomIn, ZoomOut } from "lucide-react";

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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
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

  const toggleSection = (taskId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(taskId)) {
      newCollapsed.delete(taskId);
    } else {
      newCollapsed.add(taskId);
    }
    setCollapsedSections(newCollapsed);
  };

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
      <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks yet</h3>
          <p className="text-slate-600 mb-6">Get started by creating your first project task</p>
          <Button onClick={handleAddNewTask} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Task
          </Button>
        </div>
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

  // Organize tasks by hierarchy
  const parentTasks = tasks.filter(task => !task.predecessor_id);
  const childTasks = tasks.filter(task => task.predecessor_id);

  const getChildTasks = (parentId: string) => {
    return childTasks.filter(task => task.predecessor_id === parentId);
  };

  return (
    <div className="space-y-4">
      {/* Modern Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="w-4 h-4 mr-2" />
            Quick Add Task
          </Button>
          <div className="w-px h-6 bg-slate-200"></div>
          <Button variant="ghost" size="sm" className="h-8">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <div className="w-px h-6 bg-slate-200"></div>
          <Button variant="ghost" size="sm" className="h-8">
            <Expand className="w-4 h-4 mr-2" />
            Expand all
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <FoldVertical className="w-4 h-4 mr-2" />
            Collapse all
          </Button>
          <div className="w-px h-6 bg-slate-200"></div>
          <Button variant="ghost" size="sm" className="h-8">
            <ZoomIn className="w-4 h-4 mr-2" />
            Zoom in
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <ZoomOut className="w-4 h-4 mr-2" />
            Zoom out
          </Button>
        </div>
        <Button onClick={handleAddNewTask} className="bg-blue-600 hover:bg-blue-700 h-8">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[500px] border rounded-lg bg-white shadow-sm">
        <ResizablePanel defaultSize={45} minSize={30}>
          <div className="h-full">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-10 bg-slate-50 border-b border-slate-200">
                    <TableHead className="py-2 text-xs font-semibold text-slate-700 w-16">Code</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-slate-700 min-w-[200px]">Name</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-slate-700 w-24">Start Date</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-slate-700 w-24">End Date</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-slate-700 w-20">Duration</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-slate-700 w-16">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentTasks.map(task => (
                    <React.Fragment key={task.id}>
                      <TaskRow
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
                        isCollapsed={collapsedSections.has(task.id)}
                        onToggleCollapse={() => toggleSection(task.id)}
                        hasChildren={getChildTasks(task.id).length > 0}
                      />
                      {!collapsedSections.has(task.id) && getChildTasks(task.id).map(childTask => 
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
                    </React.Fragment>
                  ))}
                  {isAddingTask && (
                    <NewTaskRow
                      key="new-task"
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
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-slate-200 hover:bg-slate-300 transition-colors" />

        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full bg-slate-50">
            <ScrollArea className="h-[500px]">
              <GanttVisualization 
                tasks={tasks} 
                dateRange={dateRange} 
                collapsedSections={collapsedSections}
                parentTasks={parentTasks}
                getChildTasks={getChildTasks}
              />
            </ScrollArea>
          </div>
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
