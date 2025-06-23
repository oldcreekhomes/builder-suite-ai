
import { useState } from "react";
import { format, parseISO, eachDayOfInterval, isSameDay, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Edit, Users } from "lucide-react";
import { ScheduleTask, useUpdateScheduleTask } from "@/hooks/useProjectSchedule";
import { EditTaskDialog } from "./EditTaskDialog";
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
}

export function GanttChart({ tasks, onTaskUpdate }: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-lg">No tasks yet</p>
        <p className="text-gray-400">Click "Add Task" to get started</p>
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

  const renderTaskRow = (task: ScheduleTask, isChild = false) => {
    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);

    return (
      <TableRow key={task.id} className={`${isChild ? 'bg-gray-50' : ''} h-10`}>
        <TableCell className={`${isChild ? 'pl-8' : 'pl-4'} font-medium py-2 text-sm`}>
          {task.task_code}
        </TableCell>
        <TableCell className="py-2 text-sm truncate max-w-[200px]" title={task.task_name}>
          {task.task_name}
        </TableCell>
        <TableCell className="py-2 text-sm">{format(startDate, 'MMM dd')}</TableCell>
        <TableCell className="py-2 text-sm">{format(endDate, 'MMM dd')}</TableCell>
        <TableCell className="py-2 text-sm">{task.duration}d</TableCell>
        <TableCell className="py-2">
          <div className="flex items-center space-x-2">
            <Progress value={task.progress} className="w-12 h-2" />
            <span className="text-xs w-8">{task.progress}%</span>
          </div>
        </TableCell>
        <TableCell className="py-2">
          {task.resources.length > 0 ? (
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {task.resources.length}
              </Badge>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">None</span>
          )}
        </TableCell>
        <TableCell className="py-2">
          {task.predecessor_id ? (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {tasks.find(t => t.id === task.predecessor_id)?.task_code || 'Unknown'}
            </Badge>
          ) : (
            <span className="text-gray-400 text-xs">None</span>
          )}
        </TableCell>
        <TableCell className="py-2">
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

  const renderGanttRow = (task: ScheduleTask, isChild = false) => {
    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);
    const taskStartIndex = dateRange.findIndex(date => isSameDay(date, startDate));
    const taskDuration = differenceInDays(endDate, startDate) + 1;
    
    return (
      <div key={task.id} className={`mb-1 ${isChild ? 'ml-4' : ''}`}>
        <div className="flex items-center h-10">
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
      <ResizablePanelGroup direction="horizontal" className="min-h-[500px] border rounded-lg">
        {/* Task Table Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <Card className="h-full border-0">
            <div className="p-3 border-b">
              <h3 className="text-base font-semibold">Tasks</h3>
            </div>
            <ScrollArea className="h-[calc(500px-50px)]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-2 text-xs">Code</TableHead>
                    <TableHead className="py-2 text-xs">Task Name</TableHead>
                    <TableHead className="py-2 text-xs">Start</TableHead>
                    <TableHead className="py-2 text-xs">End</TableHead>
                    <TableHead className="py-2 text-xs">Duration</TableHead>
                    <TableHead className="py-2 text-xs">Progress</TableHead>
                    <TableHead className="py-2 text-xs">Resources</TableHead>
                    <TableHead className="py-2 text-xs">Predecessor</TableHead>
                    <TableHead className="py-2 text-xs">Actions</TableHead>
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
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Gantt Timeline Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <Card className="h-full border-0">
            <div className="p-3 border-b">
              <h3 className="text-base font-semibold">Timeline View</h3>
            </div>
            <ScrollArea className="h-[calc(500px-50px)]">
              <div className="p-3">
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    {/* Date headers */}
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
                    
                    {/* Task bars */}
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
