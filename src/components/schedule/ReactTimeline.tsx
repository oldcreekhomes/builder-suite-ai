import { useState, useRef, useCallback } from "react";
import { ProjectTask, useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useAuth } from "@/hooks/useAuth";
import { usePublishSchedule } from "@/hooks/usePublishSchedule";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Calendar,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, startOfDay, addDays } from "date-fns";

interface ReactTimelineProps {
  projectId: string;
}

type ViewMode = "Day" | "Week" | "Month";

interface TimelineTask extends ProjectTask {
  x: number;
  width: number;
  statusColor: string;
}

export function ReactTimeline({ projectId }: ReactTimelineProps) {
  const { user } = useAuth();
  const { data: tasks, isLoading, error, refetch } = useProjectTasks(projectId);
  const { createTask, updateTask, deleteTask } = useTaskMutations(projectId);
  const { publishSchedule, isLoading: isPublishing } = usePublishSchedule(projectId);
  
  const [viewMode, setViewMode] = useState<ViewMode>("Week");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId?: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate timeline dimensions and task positions
  const calculateTimeline = useCallback((tasks: ProjectTask[]) => {
    if (!tasks.length) return { timelineTasks: [], startDate: new Date(), endDate: new Date(), dayWidth: 40 };

    const startDate = new Date(Math.min(...tasks.map(task => new Date(task.start_date).getTime())));
    const endDate = new Date(Math.max(...tasks.map(task => new Date(task.end_date).getTime())));
    
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const dayWidth = viewMode === "Day" ? 80 : viewMode === "Week" ? 40 : 20;
    
    const timelineTasks: TimelineTask[] = tasks.map(task => {
      const taskStart = new Date(task.start_date);
      const taskEnd = new Date(task.end_date);
      const daysFromStart = differenceInDays(taskStart, startDate);
      const taskDuration = differenceInDays(taskEnd, taskStart) + 1;
      
      let statusColor = "bg-blue-500"; // Default: pending
      if (task.confirmed === true) statusColor = "bg-green-500";
      else if (task.confirmed === false) statusColor = "bg-red-500";
      
      return {
        ...task,
        x: daysFromStart * dayWidth,
        width: Math.max(taskDuration * dayWidth - 2, dayWidth * 0.5),
        statusColor,
      };
    });

    return { timelineTasks, startDate, endDate, dayWidth };
  }, [viewMode]);

  const { timelineTasks, startDate, endDate, dayWidth } = tasks ? calculateTimeline(tasks) : 
    { timelineTasks: [], startDate: new Date(), endDate: new Date(), dayWidth: 40 };

  // Group tasks by parent_id for hierarchical display
  const groupedTasks = timelineTasks.reduce((acc, task) => {
    const groupId = task.parent_id || 'root';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(task);
    return acc;
  }, {} as Record<string, TimelineTask[]>);

  const handleTaskClick = (task: TimelineTask) => {
    setSelectedTaskId(task.id);
  };

  const handleContextMenu = (e: React.MouseEvent, taskId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  };

  const handleAddTask = (insertPosition?: { afterTaskId: string; position: 'above' | 'below' }) => {
    const newTask = {
      project_id: projectId,
      task_name: "New Task",
      start_date: new Date().toISOString(),
      end_date: addDays(new Date(), 1).toISOString(),
      duration: 1,
      progress: 0,
      resources: "",
      predecessor: "",
      parent_id: insertPosition ? 
        timelineTasks.find(t => t.id === insertPosition.afterTaskId)?.parent_id || null : 
        null,
    };
    
    createTask.mutate(newTask);
    setContextMenu(null);
  };

  const handleDeleteTask = () => {
    if (selectedTaskId) {
      deleteTask.mutate(selectedTaskId);
      setShowDeleteDialog(false);
      setSelectedTaskId(null);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<ProjectTask>) => {
    updateTask.mutate({ id: taskId, ...updates });
  };

  const handlePublish = () => {
    setShowPublishDialog(true);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Generate timeline header dates
  const generateTimelineHeader = () => {
    const headers = [];
    const totalDays = differenceInDays(endDate, startDate) + 1;
    
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(startDate, i);
      const shouldShow = viewMode === "Day" || 
        (viewMode === "Week" && i % 7 === 0) || 
        (viewMode === "Month" && date.getDate() === 1);
      
      if (shouldShow) {
        headers.push(
          <div
            key={i}
            className="border-r border-border px-2 py-1 text-xs font-medium text-muted-foreground"
            style={{ 
              width: viewMode === "Day" ? dayWidth : 
                     viewMode === "Week" ? dayWidth * 7 : 
                     dayWidth * 30,
              minWidth: viewMode === "Day" ? dayWidth : 
                       viewMode === "Week" ? dayWidth * 7 : 
                       dayWidth * 30
            }}
          >
            {format(date, viewMode === "Day" ? "MMM dd" : viewMode === "Week" ? "MMM dd" : "MMM yyyy")}
          </div>
        );
      }
    }
    return headers;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        <Card className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-destructive mb-4">Failed to load schedule</div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => handleAddTask()} className="h-9">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <Button
            onClick={handleDeleteTask}
            variant="outline"
            disabled={!selectedTaskId}
            className="h-9"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={() => refetch()} variant="outline" className="h-9">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={handlePublish} 
            variant="default" 
            disabled={isPublishing || !timelineTasks.length}
            className="h-9"
          >
            <Send className="w-4 h-4 mr-2" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {["Day", "Week", "Month"].map((mode) => (
            <Button
              key={mode}
              onClick={() => setViewMode(mode as ViewMode)}
              variant={viewMode === mode ? "default" : "outline"}
              size="sm"
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card className="overflow-hidden">
        {timelineTasks.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tasks in schedule</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first task to the project schedule.
            </p>
            <Button onClick={() => handleAddTask()}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Task
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Header */}
            <div className="border-b border-border bg-muted/50 sticky top-0 z-10">
              <div className="flex">
                <div className="w-80 border-r border-border p-3 font-medium">
                  Task Name
                </div>
                <div className="flex-1 overflow-x-auto">
                  <div className="flex min-w-max">
                    {generateTimelineHeader()}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Body */}
            <div ref={timelineRef} className="relative">
              {Object.entries(groupedTasks).map(([groupId, groupTasks]) => (
                <div key={groupId}>
                  {groupId !== 'root' && (
                    <div className="border-b border-border bg-muted/30 p-2 flex items-center gap-2">
                      <button
                        onClick={() => toggleGroup(groupId)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {expandedGroups.has(groupId) ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                      <span className="font-medium">Group {groupId}</span>
                    </div>
                  )}
                  
                  {(groupId === 'root' || expandedGroups.has(groupId)) && 
                    groupTasks.map((task) => (
                      <ContextMenu key={task.id}>
                        <ContextMenuTrigger>
                          <div
                            className={`border-b border-border hover:bg-muted/50 transition-colors ${
                              selectedTaskId === task.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => handleTaskClick(task)}
                            onContextMenu={(e) => handleContextMenu(e, task.id)}
                          >
                            <div className="flex">
                              {/* Task Name Column */}
                              <div className="w-80 border-r border-border p-3 flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{task.task_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(task.start_date), "MMM dd")} - {format(new Date(task.end_date), "MMM dd")}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {task.progress}%
                                  </Badge>
                                  <div className={`w-3 h-3 rounded-full ${task.statusColor}`} />
                                </div>
                              </div>
                              
                              {/* Timeline Column */}
                              <div className="flex-1 relative p-2 overflow-x-auto">
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 h-6 rounded ${task.statusColor} border border-border flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
                                  style={{
                                    left: task.x,
                                    width: task.width,
                                    minWidth: '20px'
                                  }}
                                  title={`${task.task_name} (${task.progress}%)`}
                                >
                                  <span className="text-xs text-white font-medium px-1 truncate">
                                    {task.task_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleAddTask({ afterTaskId: task.id, position: 'above' })}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task Above
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleAddTask({ afterTaskId: task.id, position: 'below' })}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task Below
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => setSelectedTaskId(task.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Select Task
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Task
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Denied</span>
        </div>
      </div>

      {/* Dialogs */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={handleDeleteTask}
        isLoading={deleteTask.isPending}
      />

      <PublishScheduleDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onPublish={(data) => {
          publishSchedule({ daysFromToday: data.daysFromToday || "1", message: data.message });
          setShowPublishDialog(false);
        }}
      />
    </div>
  );
}