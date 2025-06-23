
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

interface GanttChartProps {
  tasks: ScheduleTask[];
  onTaskUpdate: () => void;
}

export function GanttChart({ tasks, onTaskUpdate }: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const updateTaskMutation = useUpdateScheduleTask();

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
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
    const taskStartIndex = dateRange.findIndex(date => isSameDay(date, startDate));
    const taskDuration = differenceInDays(endDate, startDate) + 1;

    return (
      <TableRow key={task.id} className={isChild ? "bg-gray-50" : ""}>
        <TableCell className={`${isChild ? 'pl-8' : 'pl-4'} font-medium`}>
          {task.task_code}
        </TableCell>
        <TableCell>{task.task_name}</TableCell>
        <TableCell>{format(startDate, 'MMM dd, yyyy')}</TableCell>
        <TableCell>{format(endDate, 'MMM dd, yyyy')}</TableCell>
        <TableCell>{task.duration} days</TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Progress value={task.progress} className="w-16" />
            <span className="text-sm">{task.progress}%</span>
          </div>
        </TableCell>
        <TableCell>
          {task.resources.length > 0 ? (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <Badge variant="secondary">
                {task.resources.length} user{task.resources.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          ) : (
            <span className="text-gray-400">None</span>
          )}
        </TableCell>
        <TableCell>
          {task.predecessor_id ? (
            <Badge variant="outline">
              {tasks.find(t => t.id === task.predecessor_id)?.task_code || 'Unknown'}
            </Badge>
          ) : (
            <span className="text-gray-400">None</span>
          )}
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingTask(task)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      {/* Gantt Chart Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Task Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Resources</TableHead>
              <TableHead>Predecessor</TableHead>
              <TableHead>Actions</TableHead>
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
      </Card>

      {/* Visual Gantt Timeline */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Timeline View</h3>
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
            {parentTasks.map(task => {
              const startDate = parseISO(task.start_date);
              const endDate = parseISO(task.end_date);
              const taskStartIndex = dateRange.findIndex(date => isSameDay(date, startDate));
              const taskDuration = differenceInDays(endDate, startDate) + 1;
              
              return (
                <div key={task.id} className="mb-2">
                  <div className="flex items-center">
                    <div className="w-48 flex-shrink-0 text-sm font-medium pr-4">
                      {task.task_name}
                    </div>
                    <div className="flex relative">
                      {dateRange.map((_, index) => (
                        <div
                          key={index}
                          className="w-8 h-6 border-r border-gray-200"
                        >
                          {index >= taskStartIndex && index < taskStartIndex + taskDuration && (
                            <div 
                              className="h-full bg-blue-500 rounded"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 ${task.progress}%, #e5e7eb ${task.progress}%)`
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Child tasks */}
                  {getChildTasks(task.id).map(childTask => {
                    const childStartDate = parseISO(childTask.start_date);
                    const childEndDate = parseISO(childTask.end_date);
                    const childStartIndex = dateRange.findIndex(date => isSameDay(date, childStartDate));
                    const childDuration = differenceInDays(childEndDate, childStartDate) + 1;
                    
                    return (
                      <div key={childTask.id} className="flex items-center ml-4">
                        <div className="w-44 flex-shrink-0 text-sm text-gray-600 pr-4">
                          ↳ {childTask.task_name}
                        </div>
                        <div className="flex relative">
                          {dateRange.map((_, index) => (
                            <div
                              key={index}
                              className="w-8 h-4 border-r border-gray-200"
                            >
                              {index >= childStartIndex && index < childStartIndex + childDuration && (
                                <div 
                                  className="h-full bg-green-500 rounded"
                                  style={{
                                    background: `linear-gradient(to right, #10b981 ${childTask.progress}%, #e5e7eb ${childTask.progress}%)`
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

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
