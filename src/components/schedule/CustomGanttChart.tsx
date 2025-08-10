import React, { useState, useMemo } from 'react';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { format, addDays, differenceInDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';

interface CustomGanttChartProps {
  projectId: string;
}

export const CustomGanttChart: React.FC<CustomGanttChartProps> = ({ projectId }) => {
  const { data: tasks = [], isLoading } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');

  // Calculate date range for timeline
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: startOfWeek(today),
        end: addWeeks(startOfWeek(today), 12),
        weeks: 12
      };
    }

    const startDates = tasks.map(t => new Date(t.start_date));
    const endDates = tasks.map(t => new Date(t.end_date));
    const earliest = new Date(Math.min(...startDates.map(d => d.getTime())));
    const latest = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    const start = startOfWeek(earliest);
    const end = addWeeks(latest, 2);
    const weeks = Math.ceil(differenceInDays(end, start) / 7);

    return { start, end, weeks };
  }, [tasks]);

  // Generate week columns
  const weekColumns = useMemo(() => {
    const columns = [];
    for (let i = 0; i < dateRange.weeks; i++) {
      columns.push(addWeeks(dateRange.start, i));
    }
    return columns;
  }, [dateRange]);

  // Build task hierarchy
  const taskHierarchy = useMemo(() => {
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    const rootTasks = tasks.filter(task => !task.parent_id);
    
    const buildHierarchy = (task: any, level = 0): any => ({
      ...task,
      level,
      children: tasks
        .filter(t => t.parent_id === task.id)
        .map(child => buildHierarchy(child, level + 1))
    });

    return rootTasks.map(task => buildHierarchy(task));
  }, [tasks]);

  // Flatten hierarchy for rendering
  const flattenTasks = (hierarchyTasks: any[]): any[] => {
    const result = [];
    
    const flatten = (task: any) => {
      result.push(task);
      if (expandedTasks.has(task.id) && task.children) {
        task.children.forEach(flatten);
      }
    };

    hierarchyTasks.forEach(flatten);
    return result;
  };

  const visibleTasks = flattenTasks(taskHierarchy);

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleTaskUpdate = (taskId: string, field: string, value: any) => {
    updateTask.mutate({
      id: taskId,
      [field]: value
    });
  };

  const handleDateChange = (taskId: string, field: 'start_date' | 'end_date', date: string) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const startDate = field === 'start_date' ? new Date(date) : new Date(currentTask.start_date);
    const endDate = field === 'end_date' ? new Date(date) : new Date(currentTask.end_date);
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);

    updateTask.mutate({
      id: taskId,
      [field]: date,
      duration
    });
  };

  const addNewTask = () => {
    if (!newTaskName.trim()) return;

    const today = new Date();
    createTask.mutate({
      project_id: projectId,
      task_name: newTaskName,
      start_date: today.toISOString(),
      end_date: addDays(today, 1).toISOString(),
      duration: 1,
      progress: 0,
      order_index: tasks.length
    });

    setNewTaskName('');
  };

  const getTaskBarStyle = (task: any) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const startOffset = differenceInDays(startDate, dateRange.start);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    const totalDays = dateRange.weeks * 7;
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(width, 100 - Math.max(0, left))}%`,
      backgroundColor: `hsl(var(--primary) / ${task.progress / 100})`,
      border: '1px solid hsl(var(--primary))'
    };
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Project Schedule</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="New task name"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addNewTask()}
            className="w-48"
          />
          <Button onClick={addNewTask} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 border-b flex text-sm">
          <div className="w-64 p-3 border-r font-medium">Task Name</div>
          <div className="w-28 p-3 border-r font-medium text-center">Start Date</div>
          <div className="w-28 p-3 border-r font-medium text-center">End Date</div>
          <div className="w-20 p-3 border-r font-medium text-center">Duration</div>
          <div className="w-20 p-3 border-r font-medium text-center">Progress</div>
          <div className="w-32 p-3 border-r font-medium text-center">Predecessor</div>
          <div className="w-40 p-3 border-r font-medium text-center">Resources</div>
          <div className="flex-1 p-3 font-medium text-center">Timeline</div>
        </div>

        {/* Week headers */}
        <div className="bg-muted/30 border-b flex">
          <div className="w-64 p-2 border-r"></div>
          <div className="w-28 p-2 border-r"></div>
          <div className="w-28 p-2 border-r"></div>
          <div className="w-20 p-2 border-r"></div>
          <div className="w-20 p-2 border-r"></div>
          <div className="w-32 p-2 border-r"></div>
          <div className="w-40 p-2 border-r"></div>
          <div className="flex-1 flex">
            {weekColumns.map((week, index) => (
              <div key={index} className="flex-1 p-2 text-xs text-center border-r last:border-r-0">
                {format(week, 'MMM d')}
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        <div className="max-h-96 overflow-y-auto">
          {visibleTasks.map((task) => (
            <div key={task.id} className="flex border-b hover:bg-muted/20">
              {/* Task name */}
              <div className="w-64 p-3 border-r flex items-center">
                <div style={{ paddingLeft: `${task.level * 20}px` }} className="flex items-center gap-2">
                  {task.children && task.children.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(task.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedTasks.has(task.id) ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </button>
                  )}
                  {editingTask === task.id ? (
                    <Input
                      value={task.task_name}
                      onChange={(e) => handleTaskUpdate(task.id, 'task_name', e.target.value)}
                      onBlur={() => setEditingTask(null)}
                      onKeyPress={(e) => e.key === 'Enter' && setEditingTask(null)}
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:text-primary text-xs"
                      onClick={() => setEditingTask(task.id)}
                    >
                      {task.task_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Start date */}
              <div className="w-28 p-3 border-r">
                <Input
                  type="date"
                  value={format(new Date(task.start_date), 'yyyy-MM-dd')}
                  onChange={(e) => handleDateChange(task.id, 'start_date', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* End date */}
              <div className="w-28 p-3 border-r">
                <Input
                  type="date"
                  value={format(new Date(task.end_date), 'yyyy-MM-dd')}
                  onChange={(e) => handleDateChange(task.id, 'end_date', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Duration */}
              <div className="w-20 p-3 border-r">
                <Input
                  type="number"
                  min="1"
                  value={task.duration || 1}
                  onChange={(e) => handleTaskUpdate(task.id, 'duration', parseInt(e.target.value) || 1)}
                  className="h-8 text-center text-xs"
                />
              </div>

              {/* Progress */}
              <div className="w-20 p-3 border-r">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={task.progress}
                  onChange={(e) => handleTaskUpdate(task.id, 'progress', parseInt(e.target.value) || 0)}
                  className="h-8 text-center text-xs"
                />
              </div>

              {/* Predecessor */}
              <div className="w-32 p-3 border-r">
                <Input
                  placeholder="Task ID"
                  value={task.predecessor || ''}
                  onChange={(e) => handleTaskUpdate(task.id, 'predecessor', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Resources */}
              <div className="w-40 p-3 border-r">
                <Input
                  placeholder="Assign resources"
                  value={task.resources || ''}
                  onChange={(e) => handleTaskUpdate(task.id, 'resources', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Timeline */}
              <div className="flex-1 p-3 relative">
                <div className="relative h-6 bg-muted/30 rounded">
                  <div
                    className="absolute top-0 h-full rounded flex items-center justify-center text-xs text-white font-medium"
                    style={getTaskBarStyle(task)}
                  >
                    {task.progress > 0 && `${task.progress}%`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};