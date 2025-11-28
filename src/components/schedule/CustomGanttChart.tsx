import React, { useState, useEffect, useRef } from "react";
import { useProjectTasks, addPendingUpdate } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";
import { useOptimizedRealtime } from "@/hooks/useOptimizedRealtime";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateParentTaskValues, 
  shouldUpdateParentTask,
  getDependentTasks as getTasksWithDependency 
} from "@/utils/scheduleCalculations";
import { 
  computeDeleteUpdates, 
  computeBulkDeleteUpdates,
  generateIndentUpdates,
  computeOutdentUpdates,
  computeDragDropUpdates,
  computeNormalizationUpdates,
  needsNormalization,
  getDescendantIds
} from "@/utils/scheduleOperations";
import { DateString, today, addDays, addBusinessDays, getNextBusinessDay, isBusinessDay, calculateBusinessEndDate, getCalendarDaysBetween, getBusinessDaysBetween, ensureBusinessDay, formatYMD } from "@/utils/dateOnly";
import { UnifiedScheduleTable } from "./UnifiedScheduleTable";
import { AddTaskDialog } from "./AddTaskDialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { CopyScheduleDialog } from "./CopyScheduleDialog";
import { useCopySchedule } from "@/hooks/useCopySchedule";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getLevel } from "@/utils/hierarchyUtils";

interface CustomGanttChartProps {
  projectId: string;
}

export function CustomGanttChart({ projectId }: CustomGanttChartProps) {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { updateTask, createTask, deleteTask } = useTaskMutations(projectId);
  const { bulkDeleteTasks, bulkUpdateHierarchies, bulkUpdatePredecessors } = useTaskBulkMutations(projectId);
  const copyScheduleMutation = useCopySchedule();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simplified flags - removed complex auto-recalc machinery
  const hasNormalizedRef = useRef(false);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showCopyScheduleDialog, setShowCopyScheduleDialog] = useState(false);
  
  // Zoom state for timeline
  const [dayWidth, setDayWidth] = useState(40); // pixels per day
  
  // Debug: Force rebuild to clear any cache issues  
  console.log('CustomGanttChart component loaded and race condition fixes applied');
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandAllTasks, setExpandAllTasks] = useState(false);
  const [collapseAllTasks, setCollapseAllTasks] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{ taskId: string; dependentTasks: any[] } | null>(null);
  
  
  // Use optimized realtime hook
  useOptimizedRealtime(projectId);


  // Helper function to calculate end date from start date + duration

  // Helper function to check if a task has children based on hierarchy
  const hasChildren = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.hierarchy_number) return false;
    
    return tasks.some(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(task.hierarchy_number + ".") &&
      t.hierarchy_number.split(".").length === task.hierarchy_number.split(".").length + 1
    );
  };

  // Filter tasks based on expansion state using hierarchy numbers
  const getVisibleTasks = () => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const aHierarchy = a.hierarchy_number || '';
      const bHierarchy = b.hierarchy_number || '';
      return aHierarchy.localeCompare(bHierarchy, undefined, { numeric: true });
    });

    const visibleTasks: ProjectTask[] = [];
    
    for (const task of sortedTasks) {
      if (!task.hierarchy_number) {
        visibleTasks.push(task);
        continue;
      }
      
      // Always show root tasks (no dots in hierarchy)
      if (!task.hierarchy_number.includes(".")) {
        visibleTasks.push(task);
        continue;
      }
      
      // For nested tasks, check if all parent levels are expanded
      const hierarchyParts = task.hierarchy_number.split(".");
      let shouldShow = true;
      
      // Check each parent level
      for (let i = 1; i < hierarchyParts.length; i++) {
        const parentHierarchy = hierarchyParts.slice(0, i).join(".");
        const parentTask = tasks.find(t => t.hierarchy_number === parentHierarchy);
        
        if (parentTask && !expandedTasks.has(parentTask.id)) {
          shouldShow = false;
          break;
        }
      }
      
      if (shouldShow) {
        visibleTasks.push(task);
      }
    }
    
    return visibleTasks;
  };

  const visibleTasks = getVisibleTasks();

  // Timeline range calculation using date-only approach
  const getTimelineRange = (): { start: DateString; end: DateString } => {
    try {
      const todayStr = today();
      const futureBuffer = addBusinessDays(todayStr, 30); // Always include 30 business days from today
      
      if (!tasks || tasks.length === 0) {
        return {
          start: todayStr,
          end: futureBuffer
        };
      }

      // Get all valid dates as date strings
      const validDates: DateString[] = [];
      tasks.forEach(task => {
        if (task.start_date) {
          const datePart = task.start_date.split('T')[0];
          if (datePart && datePart.length === 10) {
            validDates.push(datePart);
          }
        }
        if (task.end_date) {
          const datePart = task.end_date.split('T')[0];
          if (datePart && datePart.length === 10) {
            validDates.push(datePart);
          }
        }
      });

      if (validDates.length === 0) {
        return {
          start: todayStr,
          end: futureBuffer
        };
      }

      // Find the min and max dates using string comparison (YYYY-MM-DD)
      const minDate = validDates.reduce((min, current) => current < min ? current : min);
      const maxDate = validDates.reduce((max, current) => current > max ? current : max);

      // Timeline start: use the earlier of project start or today
      const timelineStart = minDate < todayStr ? minDate : todayStr;

      // Timeline end: use the later of project end + buffer or today + 30 business days
      const projectEndWithBuffer = addBusinessDays(maxDate, 5);
      const timelineEnd = projectEndWithBuffer > futureBuffer ? projectEndWithBuffer : futureBuffer;

      // Cap the total range to prevent performance issues (3 years max)
      const totalDays = getCalendarDaysBetween(timelineStart, timelineEnd);
      const maxDays = 1095; // 3 years
      const finalEnd = totalDays > maxDays 
        ? addDays(timelineStart, maxDays - 1)
        : timelineEnd;

      if (totalDays > maxDays) {
        console.warn(`⚠️ Timeline range capped at ${maxDays} days for performance`);
      }

      return {
        start: timelineStart,
        end: finalEnd
      };
    } catch (error) {
      console.error('Error calculating timeline range:', error);
      const todayStr = today();
      return {
        start: todayStr,
        end: addBusinessDays(todayStr, 30)
      };
    }
  };

  const timelineRange = getTimelineRange();
  const { start: timelineStart, end: timelineEnd } = timelineRange;


  // Handle expansion state changes
  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Effect to expand all tasks when expandAllTasks becomes true
  useEffect(() => {
    if (expandAllTasks) {
      const tasksWithChildren = tasks.filter(task => hasChildren(task.id));
      setExpandedTasks(new Set(tasksWithChildren.map(task => task.id)));
      // Reset the flag
      setExpandAllTasks(false);
    }
  }, [expandAllTasks, tasks]);

  // Effect to collapse all tasks when collapseAllTasks becomes true
  useEffect(() => {
    if (collapseAllTasks) {
      setExpandedTasks(new Set());
      setCollapseAllTasks(false); // Reset flag after collapsing
    }
  }, [collapseAllTasks]);

  // Handle drag-and-drop task reordering
  const handleDragDrop = async (draggedTaskId: string, targetTaskId: string, dropPosition: 'before' | 'after') => {
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask || !user) {
      console.error('❌ Task or user not found for drag-drop');
      return;
    }
    
    // Import the drag-drop logic
    const { computeDragDropUpdates } = await import("@/utils/dragDropLogic");
    
    // Capture original tasks before any optimistic updates
    const originalTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
    const result = computeDragDropUpdates(draggedTask, targetTask, dropPosition, originalTasks);
    
    if (result.hierarchyUpdates.length === 0) {
      console.log('No hierarchy updates needed');
      return;
    }
    
    try {
      console.log('🔄 Starting drag-drop for task:', draggedTask.task_name, '→', targetTask.task_name, dropPosition);
      console.log('📊 Drag-drop updates computed:', {
        hierarchyUpdates: result.hierarchyUpdates.length,
        predecessorUpdates: result.predecessorUpdates.length
      });
      
      // Add affected task ids to pending set to ignore realtime echoes
      const { addPendingUpdate } = await import('@/hooks/useProjectTasks');
      result.hierarchyUpdates.forEach(update => addPendingUpdate(update.id));
      
      // Apply optimistic update to cache first for instant UI feedback
      const optimisticTasks = originalTasks.map(t => {
        const hierarchyUpdate = result.hierarchyUpdates.find(u => u.id === t.id);
        return hierarchyUpdate ? { ...t, hierarchy_number: hierarchyUpdate.hierarchy_number } : t;
      });
      
      queryClient.setQueryData(['project-tasks', projectId, user.id], optimisticTasks);
      
      // Apply bulk hierarchy updates to database with ordered execution
      await bulkUpdateHierarchies.mutateAsync({
        updates: result.hierarchyUpdates,
        originalTasks,
        ordered: true, // Use ordered execution for reorder operations
        options: { suppressInvalidate: true }
      });
      
      // Apply predecessor updates if needed
      if (result.predecessorUpdates.length > 0) {
        result.predecessorUpdates.forEach(update => addPendingUpdate(update.taskId));
        const predecessorUpdates = result.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({
          updates: predecessorUpdates,
          options: { suppressInvalidate: true }
        });
      }
      
      // Final cache invalidation
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      
      toast({ title: "Success", description: `Moved "${draggedTask.task_name}" successfully` });
      
    } catch (error) {
      console.error('❌ Failed to drag-drop task:', error);
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      
      toast({ title: "Error", description: "Failed to reorder task", variant: "destructive" });
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any, options?: { silent?: boolean }) => {
    // Prevent updates to optimistic (unsaved) tasks
    if (taskId.startsWith('optimistic-')) {
      if (!options?.silent) {
        toast({ title: "Error", description: "Please save the task first before editing", variant: "destructive" });
      }
      return;
    }
    
    console.log('📝 Timeline task update called:', taskId, updates);
    
    // Set user edit cooldown to prevent real-time stomping
    (window as any).__userEditCooldownUntil = Date.now() + 1000; // 1 second cooldown
    
    // OPTIMISTIC UPDATE: Immediately update cache for instant UI feedback
    const currentTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
    const optimisticTasks = currentTasks.map(task => {
      if (task.id === taskId) {
        const optimisticTask = { ...task };
        
        // Apply updates and normalize dates
        if (updates.start_date) {
          optimisticTask.start_date = updates.start_date.split('T')[0] + 'T00:00:00';
        }
        if (updates.end_date) {
          optimisticTask.end_date = updates.end_date.split('T')[0] + 'T00:00:00';
        }
        if (updates.duration !== undefined) {
          optimisticTask.duration = updates.duration;
        }
        if (updates.task_name !== undefined) {
          optimisticTask.task_name = updates.task_name;
        }
        if (updates.progress !== undefined) {
          optimisticTask.progress = updates.progress;
        }
        if (updates.resources !== undefined) {
          optimisticTask.resources = updates.resources;
        }
        if (updates.notes !== undefined) {
          optimisticTask.notes = updates.notes;
        }
        
        // Always keep start/end/duration in sync for instant UI feedback
        
        // If start_date changed and end_date not provided, compute end_date
        if (updates.start_date && !updates.end_date) {
          const currentDuration = optimisticTask.duration || 1;
          const startYmd = optimisticTask.start_date.split('T')[0];
          const endYmd = calculateBusinessEndDate(startYmd as DateString, currentDuration);
          optimisticTask.end_date = endYmd + 'T00:00:00';
        }
        
        // If duration changed and end_date not provided, compute end_date
        if (updates.duration !== undefined && !updates.end_date) {
          const startYmd = optimisticTask.start_date.split('T')[0];
          const endYmd = calculateBusinessEndDate(startYmd as DateString, updates.duration);
          optimisticTask.end_date = endYmd + 'T00:00:00';
        }
        
        // If end_date changed, recompute duration
        if (updates.end_date) {
          const startYmd = optimisticTask.start_date.split('T')[0];
          const endYmd = optimisticTask.end_date.split('T')[0];
          optimisticTask.duration = getBusinessDaysBetween(startYmd as DateString, endYmd as DateString);
        }
        
        return optimisticTask;
      }
      return task;
    });
    
    // Apply optimistic update immediately
    queryClient.setQueryData(['project-tasks', projectId, user?.id], optimisticTasks);
    
    // Add to pending updates to ignore real-time echoes (longer TTL for cascades)
    const { addPendingUpdate } = await import('@/hooks/useProjectTasks');
    addPendingUpdate(taskId, 6000); // 6s TTL to cover cascade processing
    
    // Fire-and-forget mutation (async cascade will refresh cache when complete)
    updateTask.mutate({
      id: taskId,
      ...updates,
      suppressInvalidate: true // Cache already updated optimistically
    });
    
    // Instant success feedback
    if (!options?.silent) {
      toast({ title: "Success", description: "Task updated successfully" });
    }
  };

  const handleIndent = async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    // Import the new function
    const { generateIndentUpdates } = await import("@/utils/hierarchyUtils");
    const updates = generateIndentUpdates(task, tasks);
    
    if (updates.length === 0) {
      toast({ title: "Error", description: "Cannot indent this task", variant: "destructive" });
      return;
    }
    
    try {
      // Add affected task ids to pending set to ignore realtime echoes
      const { addPendingUpdate } = await import('@/hooks/useProjectTasks');
      updates.forEach(update => addPendingUpdate(update.id));
      
      // Apply optimistic update to cache first for instant UI feedback
      const currentTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
      const optimisticTasks = currentTasks.map(t => {
        const update = updates.find(u => u.id === t.id);
        return update ? { ...t, hierarchy_number: update.hierarchy_number } : t;
      });
      
      queryClient.setQueryData(['project-tasks', projectId, user.id], optimisticTasks);
      
      // Apply bulk hierarchy updates to database
      await bulkUpdateHierarchies.mutateAsync({
        updates: updates.map(u => ({ id: u.id, hierarchy_number: u.hierarchy_number })),
        options: { suppressInvalidate: true }
      });
      
      // Expand all tasks after successful indent
      setExpandAllTasks(true);
      
      toast({ title: "Success", description: "Task indented successfully" });
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      toast({ title: "Error", description: "Failed to indent task", variant: "destructive" });
      console.error("Error indenting task:", error);
    }
  };

  const handleOutdent = async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    // Import the outdent logic
    const { computeOutdentUpdates } = await import("@/utils/outdentLogic");
    
    // Capture original tasks before any optimistic updates
    const originalTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
    const result = computeOutdentUpdates(task, originalTasks);
    
    if (result.hierarchyUpdates.length === 0) {
      toast({ title: "Error", description: "Cannot outdent this task", variant: "destructive" });
      return;
    }
    
    try {
      console.log('🔄 Starting outdent for task:', task.task_name);
      console.log('📊 Outdent updates computed:', {
        hierarchyUpdates: result.hierarchyUpdates.length,
        predecessorUpdates: result.predecessorUpdates.length
      });
      
      // Apply optimistic update to cache first for instant UI feedback
      const optimisticTasks = originalTasks.map(t => {
        const hierarchyUpdate = result.hierarchyUpdates.find(u => u.id === t.id);
        return hierarchyUpdate ? { ...t, hierarchy_number: hierarchyUpdate.hierarchy_number } : t;
      });
      
      queryClient.setQueryData(['project-tasks', projectId, user.id], optimisticTasks);
      
      // Apply bulk hierarchy updates to database with original tasks for comparison
      await bulkUpdateHierarchies.mutateAsync({
        updates: result.hierarchyUpdates,
        originalTasks,
        options: { suppressInvalidate: true }
      });
      
      // Apply predecessor updates if any
      if (result.predecessorUpdates.length > 0) {
        const predecessorUpdates = result.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        
        await bulkUpdatePredecessors.mutateAsync({
          updates: predecessorUpdates,
          options: { suppressInvalidate: true }
        });
      }
      
      // Expand all tasks after successful outdent
      setExpandAllTasks(true);
      
      toast({ title: "Success", description: "Task outdented successfully" });
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      toast({ title: "Error", description: "Failed to outdent task", variant: "destructive" });
      console.error("Error outdenting task:", error);
    }
  };

  // Parent recalculation is now handled by useTaskMutations batch cascade

  // SIMPLE: Just add tasks at the end for now
  const getNextTopLevelNumber = (tasks: ProjectTask[]): string => {
    const topLevelNumbers = tasks
      .map(t => t.hierarchy_number?.split('.')[0])
      .filter(n => n)
      .map(n => parseInt(n) || 0);
    
    return topLevelNumbers.length > 0 
      ? (Math.max(...topLevelNumbers) + 1).toString()
      : "1";
  };

  // Add new parent group when Add button is clicked
  const handleAddTask = async () => {
    try {
      const newHierarchyNumber = getNextTopLevelNumber(tasks);
      
      // Use business day utilities with date strings
      const startDate = ensureBusinessDay(today());
      const endDate = calculateBusinessEndDate(startDate, 1);
      
      // Format as YYYY-MM-DDT00:00:00 using local dates
      const startString = formatYMD(startDate) + 'T00:00:00';
      const endString = formatYMD(endDate) + 'T00:00:00';

      await createTask.mutateAsync({
        project_id: projectId,
        task_name: 'New Task',
        start_date: startString,
        end_date: endString,
        duration: 1,
        progress: 0,
        hierarchy_number: newHierarchyNumber
      });
      
      toast({ title: "Success", description: "Group added successfully" });
    } catch (error) {
      console.error("Failed to add group:", error);
      toast({ title: "Error", description: "Failed to add group", variant: "destructive" });
    }
  };

  const handleCopySchedule = () => {
    setShowCopyScheduleDialog(true);
  };

  const handleCopyScheduleSubmit = async (options: any) => {
    const { data: sourceTasks } = await supabase
      .from('project_schedule_tasks')
      .select('*')
      .eq('project_id', options.sourceProjectId);

    if (sourceTasks) {
      // Transform the tasks to match ProjectTask interface
      const transformedTasks: ProjectTask[] = sourceTasks.map(task => ({
        ...task,
        predecessor: typeof task.predecessor === 'string' 
          ? task.predecessor 
          : task.predecessor 
            ? String(task.predecessor) 
            : null
      }));

      await copyScheduleMutation.mutateAsync({
        targetProjectId: projectId,
        options,
        sourceTasks: transformedTasks
      });
    }
  };

  // Handle adding a task above another task with optimistic UI
  const handleAddAbove = async (relativeTaskId: string) => {
    try {
      const targetTask = tasks.find(t => t.id === relativeTaskId);
      if (!targetTask || !targetTask.hierarchy_number) {
        toast({ title: "Error", description: "Invalid task selected", variant: "destructive" });
        return;
      }

      // Import the add above logic
      const { calculateAddAboveUpdates } = await import('@/utils/addAboveLogic');
      
      // Calculate all updates needed
      const { newTaskHierarchy, hierarchyUpdates, predecessorUpdates } = 
        calculateAddAboveUpdates(targetTask, tasks);
      
      console.log("🔄 Calculated updates:", {
        hierarchyUpdates: hierarchyUpdates.length,
        predecessorUpdates: predecessorUpdates.length
      });

      // Set batch operation flag to suppress real-time updates
      (window as any).__batchOperationInProgress = true;

      // CRITICAL: Capture original tasks BEFORE any optimistic updates to avoid cache collisions
      const originalTasks = queryClient.getQueryData(['project-tasks', projectId, user?.id]) as ProjectTask[] || [];
      console.log("📸 Captured original tasks snapshot:", originalTasks.length);

      // Create optimistic task immediately with business day logic
      const startDate = ensureBusinessDay(today());
      const endDate = calculateBusinessEndDate(startDate, 1);
      
      const optimisticTask: ProjectTask = {
        id: `optimistic-${Date.now()}`,
        project_id: projectId,
        task_name: "New Task",
        start_date: formatYMD(startDate) + "T00:00:00+00:00",
        end_date: formatYMD(endDate) + "T00:00:00+00:00",
        duration: 1,
        progress: 0,
        predecessor: undefined,
        resources: undefined,
        hierarchy_number: newTaskHierarchy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Immediately update the cache with optimistic data
      queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [optimisticTask];
        
        // Apply hierarchy updates optimistically
        const updatedTasks = oldData.map(task => {
          const hierarchyUpdate = hierarchyUpdates.find(u => u.id === task.id);
          const predecessorUpdate = predecessorUpdates.find(u => u.taskId === task.id);
          
          return {
            ...task,
            ...(hierarchyUpdate && { hierarchy_number: hierarchyUpdate.hierarchy_number }),
            ...(predecessorUpdate && { predecessor: predecessorUpdate.newPredecessors })
          } as ProjectTask;
        });
        
        // Insert the optimistic task in the correct position
        const targetIndex = updatedTasks.findIndex(t => t.hierarchy_number === targetTask.hierarchy_number);
        if (targetIndex >= 0) {
          updatedTasks.splice(targetIndex, 0, optimisticTask as ProjectTask);
        } else {
          updatedTasks.push(optimisticTask as ProjectTask);
        }
        
        return updatedTasks;
      });

      // Use bulk mutations instead of RPC to properly handle hierarchy updates
      console.log("🔄 Starting add above operation with bulk mutations...");
      
      const startString = formatYMD(startDate) + 'T00:00:00+00:00';
      const endString = formatYMD(endDate) + 'T00:00:00+00:00';
      
      // Step 1: Apply hierarchy updates to shift existing tasks using ORIGINAL data
      if (hierarchyUpdates.length > 0) {
        console.log("📊 Applying hierarchy updates:", hierarchyUpdates.length);
        // Use original tasks to avoid cache collision and force ordered execution
        await bulkUpdateHierarchies.mutateAsync({
          updates: hierarchyUpdates,
          originalTasks,
          ordered: true, // Force ordered execution for add above operations
          options: { suppressInvalidate: true }
        });
      }
      
      // Step 2: Apply predecessor updates
      if (predecessorUpdates.length > 0) {
        console.log("🔗 Applying predecessor updates:", predecessorUpdates.length);
        const predecessorBulkUpdates = predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorBulkUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Step 3: Create the new task at the target hierarchy position
      console.log("➕ Creating new task at hierarchy:", newTaskHierarchy);
      const createdTask = await createTask.mutateAsync({
        project_id: projectId,
        task_name: "New Task",
        start_date: startString,
        end_date: endString,
        duration: 1,
        progress: 0,
        hierarchy_number: newTaskHierarchy,
        predecessor: [],
        resources: null
      });

      console.log("✅ Add above operation completed, new task ID:", createdTask.id);

      // Create new task object to replace optimistic one
      const newTask: ProjectTask = {
        id: createdTask.id,
        project_id: createdTask.project_id,
        task_name: createdTask.task_name,
        start_date: createdTask.start_date,
        end_date: createdTask.end_date,
        duration: createdTask.duration,
        progress: createdTask.progress || 0,
        predecessor: createdTask.predecessor as string | string[] | undefined,
        resources: createdTask.resources || undefined,
        hierarchy_number: createdTask.hierarchy_number,
        created_at: createdTask.created_at,
        updated_at: createdTask.updated_at,
        confirmed: true,
        notes: createdTask.notes || undefined
      };

      // Replace optimistic task with real task
      queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [newTask];
        return oldData.map(task => 
          task.id === optimisticTask.id ? newTask : task
        );
      });

      // Also invalidate to ensure immediate sync with database
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });

      console.log("✅ Add Above operation completed successfully");
      toast({ title: "Success", description: "Task added above successfully" });
    } catch (error) {
      console.error("❌ Add Above operation failed:", error);
      
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: `Failed to add task above: ${errorMessage}`, variant: "destructive" });
    } finally {
      // Clear batch operation flag
      (window as any).__batchOperationInProgress = false;
    }
  };

  // DISABLED: Add below functionality
  const handleAddBelow = async (relativeTaskId: string) => {
    toast({ title: "Info", description: "Add below temporarily disabled - use Add Above instead" });
  };

  // Handle single task deletion with dependency check and proper renumbering
  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if task has children - prevent deletion if so
    if (hasChildren(taskId)) {
      toast({ title: "Error", description: "Cannot delete parent task - delete all child tasks first", variant: "destructive" });
      return;
    }

    // Check for dependent tasks
    const dependentTasks = getTasksWithDependency(task.hierarchy_number!, tasks);
    
    if (dependentTasks.length > 0) {
      setPendingDelete({ taskId, dependentTasks });
      return;
    }

    try {
      // Import delete logic here to avoid circular dependencies
      const { computeDeleteUpdates } = await import('@/utils/deleteTaskLogic');
      
      // Compute all updates needed for this deletion
      let deleteResult;
      try {
        deleteResult = computeDeleteUpdates(task, tasks);
      } catch (error) {
        console.error("❌ Pre-flight failed - Delete computation:", error);
        toast({ title: "Error", description: `Failed to compute delete updates: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        return;
      }
      
      console.log(`🗑️ DELETE OPERATION: ${deleteResult.tasksToDelete.length} tasks to delete, ${deleteResult.hierarchyUpdates.length} hierarchy updates, ${deleteResult.predecessorUpdates.length} predecessor updates`);
      
      // Set batch operation flag
      (window as any).__batchOperationInProgress = true;

      // Phase 1: Delete all tasks in bulk
      try {
        console.log('🔄 Phase 1: Bulk deleting tasks');
        if (deleteResult.tasksToDelete.length > 0) {
          await bulkDeleteTasks.mutateAsync({ 
            taskIds: deleteResult.tasksToDelete, 
            options: { suppressInvalidate: true } 
          });
        }
        console.log('✅ Phase 1 completed successfully');
      } catch (error) {
        console.error('❌ Phase 1 (Bulk Delete) failed:', error);
        toast({ title: "Error", description: `Failed to delete task - Phase 1: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
        return;
      }
      
      // Phase 2: Bulk update hierarchies with ordered execution
      if (deleteResult.hierarchyUpdates.length > 0) {
        try {
          console.log(`🔄 Phase 2: Bulk updating ${deleteResult.hierarchyUpdates.length} hierarchy updates with ordered execution`);
          await bulkUpdateHierarchies.mutateAsync({ 
            updates: deleteResult.hierarchyUpdates, 
            originalTasks: tasks,
            options: { suppressInvalidate: true },
            ordered: true // Force ordered execution for delete operations
          });
          
          // Immediately patch cache with Phase 2 updates
          queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(task => {
              const update = deleteResult.hierarchyUpdates.find(u => u.id === task.id);
              return update ? { ...task, hierarchy_number: update.hierarchy_number } : task;
            });
          });
          console.log('✅ Phase 2 completed successfully');
        } catch (error) {
          console.error('❌ Phase 2 (Hierarchy Updates) failed:', error);
          toast({ title: "Error", description: `Failed to delete task - Phase 2: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
          return;
        }
      }
      
      // Phase 3: Bulk update predecessors with type-safe handling
      if (deleteResult.predecessorUpdates.length > 0) {
        try {
          console.log(`🔄 Phase 3: Bulk updating ${deleteResult.predecessorUpdates.length} predecessor references`);
          const predecessorUpdates = deleteResult.predecessorUpdates.map(update => ({
            id: update.taskId,
            // Always store predecessor as array for consistency
            predecessor: update.newPredecessors
          }));
          await bulkUpdatePredecessors.mutateAsync({ 
            updates: predecessorUpdates, 
            options: { suppressInvalidate: true } 
          });
          console.log('✅ Phase 3 completed successfully');
        } catch (error) {
          console.error('❌ Phase 3 (Predecessor Updates) failed:', error);
          // Don't throw - allow deletion to complete even if predecessor cleanup fails
          console.log('⚠️ Continuing deletion despite predecessor update failure');
          toast({ title: "Error", description: `Task deleted but some predecessor references may need manual cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
        }
      }
      
      // Phase 4: Normalize hierarchy to ensure first row is 1
      try {
        console.log('🔢 Phase 4: Normalizing hierarchy numbering');
        const { computeNormalizationUpdates } = await import('@/utils/hierarchyNormalization');
        
        // Build post-delete snapshot: current tasks minus deleted ones, plus applied hierarchy updates
        let postDeleteSnapshot = tasks
          .filter(t => !deleteResult.tasksToDelete.includes(t.id))
          .map(t => ({ ...t })); // Deep clone
        
        // Apply Phase 2 hierarchy updates to the snapshot
        deleteResult.hierarchyUpdates.forEach(update => {
          const task = postDeleteSnapshot.find(t => t.id === update.id);
          if (task) {
            task.hierarchy_number = update.hierarchy_number;
          }
        });
        
        console.log(`🔢 Computing normalization from snapshot of ${postDeleteSnapshot.length} tasks`);
        const normalizationResult = computeNormalizationUpdates(postDeleteSnapshot);
        
        if (normalizationResult.hierarchyUpdates.length > 0) {
          console.log(`📋 Phase 4a: Normalizing ${normalizationResult.hierarchyUpdates.length} hierarchy numbers with ordered execution`);
          await bulkUpdateHierarchies.mutateAsync({ 
            updates: normalizationResult.hierarchyUpdates, 
            options: { suppressInvalidate: true },
            ordered: true // Force ordered execution for normalization
          });
          
          // Immediately patch cache with Phase 4 normalization updates
          queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(task => {
              const update = normalizationResult.hierarchyUpdates.find(u => u.id === task.id);
              return update ? { ...task, hierarchy_number: update.hierarchy_number } : task;
            });
          });
        }
        
        if (normalizationResult.predecessorUpdates.length > 0) {
          console.log(`🔗 Phase 4b: Remapping ${normalizationResult.predecessorUpdates.length} predecessor references after normalization`);
          const predecessorNormUpdates = normalizationResult.predecessorUpdates.map(update => ({
            id: update.taskId,
            predecessor: update.newPredecessors
          }));
          await bulkUpdatePredecessors.mutateAsync({ 
            updates: predecessorNormUpdates, 
            options: { suppressInvalidate: true } 
          });
        }
        console.log('✅ Phase 4 completed successfully');
      } catch (error) {
        console.error('❌ Phase 4 (Normalization) failed:', error);
        toast({ title: "Error", description: `Failed to delete task - Phase 4: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
        throw error;
      }
      
      // Phase 5: Parent recalculation now handled automatically by useTaskMutations batch cascade
      console.log('✅ Phase 5: Parent recalculation will be handled by cascade system');
      console.log('✅ Phase 5 completed successfully');
        toast({ title: "Error", description: `Task deleted but parent date recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      }
      
      // Remove from selected tasks if it was selected
      if (selectedTasks.has(taskId)) {
        const newSelected = new Set(selectedTasks);
        newSelected.delete(taskId);
        setSelectedTasks(newSelected);
      }
      
      toast({ title: "Success", description: "Task deleted successfully" });
    } catch (error) {
      console.error("Failed to delete task:", error);
      // Generic fallback if specific phase error handling didn't catch it
      if (!error.message?.includes('Phase')) {
        toast({ title: "Error", description: `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      }
    } finally {
      // Clear batch flag and invalidate cache once
      (window as any).__batchOperationInProgress = false;
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  // Handle bulk delete for multiple selected tasks with dependency check
  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) {
      toast({ title: "Error", description: "No tasks selected", variant: "destructive" });
      return;
    }

    const selectedTaskIds = Array.from(selectedTasks);
    
    // Check if any parent groups are selected without all their children
    for (const taskId of selectedTaskIds) {
      const task = tasks.find(t => t.id === taskId);
      if (task && hasChildren(taskId)) {
        // Get all children of this parent
        const children = tasks.filter(t => 
          t.hierarchy_number && 
          t.hierarchy_number.startsWith(task.hierarchy_number + ".") &&
          t.hierarchy_number.split(".").length === task.hierarchy_number.split(".").length + 1
        );
        
        // Check if all direct children are also selected
        const allChildrenSelected = children.every(child => selectedTasks.has(child.id));
        if (!allChildrenSelected) {
          toast({ title: "Error", description: "Cannot delete parent task - select all child tasks first or delete child tasks individually", variant: "destructive" });
          return;
        }
      }
    }

    // Check for dependencies across all selected tasks
    const dependentTasks: any[] = [];
    
    for (const taskId of selectedTaskIds) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const deps = getTasksWithDependency(task.hierarchy_number!, tasks);
        // Only include dependencies that are NOT also being deleted
        const externalDeps = deps.filter(dep => !selectedTasks.has(dep.id));
        dependentTasks.push(...externalDeps);
      }
    }

    if (dependentTasks.length > 0) {
      toast({ title: "Error", description: `Cannot delete tasks: ${dependentTasks.length} other task(s) depend on selected tasks`, variant: "destructive" });
      return;
    }

    try {
      // Use the proper bulk delete logic with renumbering
      const deleteResult = computeBulkDeleteUpdates(selectedTaskIds, tasks);
      
      console.log(`🚀 Starting optimized bulk delete of ${deleteResult.tasksToDelete.length} tasks`);
      
      // Set batch operation flag
      (window as any).__batchOperationInProgress = true;
      
      // Phase 1: Bulk delete all tasks
      if (deleteResult.tasksToDelete.length > 0) {
        console.log(`🗑️ Phase 1: Bulk deleting ${deleteResult.tasksToDelete.length} tasks`);
        await bulkDeleteTasks.mutateAsync({ 
          taskIds: deleteResult.tasksToDelete, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 2: Bulk update hierarchies if needed
      if (deleteResult.hierarchyUpdates.length > 0) {
        console.log(`📋 Phase 2: Bulk updating ${deleteResult.hierarchyUpdates.length} task hierarchies`);
        await bulkUpdateHierarchies.mutateAsync({ 
          updates: deleteResult.hierarchyUpdates, 
          options: { suppressInvalidate: true } 
        });
        
        // Immediately patch cache with Phase 2 updates
        queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(task => {
            const update = deleteResult.hierarchyUpdates.find(u => u.id === task.id);
            return update ? { ...task, hierarchy_number: update.hierarchy_number } : task;
          });
        });
      }
      
      // Phase 3: Bulk update predecessors if needed
      if (deleteResult.predecessorUpdates.length > 0) {
        console.log(`🔗 Phase 3: Bulk updating ${deleteResult.predecessorUpdates.length} task predecessors`);
        const predecessorUpdates = deleteResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 4: Normalize hierarchy to ensure first row is 1
      console.log('🔢 Phase 4: Normalizing hierarchy numbering');
      const { computeNormalizationUpdates } = await import('@/utils/hierarchyNormalization');
      
      // Build post-delete snapshot: current tasks minus deleted ones, plus applied hierarchy updates
      let postDeleteSnapshot = tasks
        .filter(t => !deleteResult.tasksToDelete.includes(t.id))
        .map(t => ({ ...t })); // Deep clone
      
      // Apply Phase 2 hierarchy updates to the snapshot
      deleteResult.hierarchyUpdates.forEach(update => {
        const task = postDeleteSnapshot.find(t => t.id === update.id);
        if (task) {
          task.hierarchy_number = update.hierarchy_number;
        }
      });
      
      console.log(`🔢 Computing normalization from snapshot of ${postDeleteSnapshot.length} tasks`);
      const normalizationResult = computeNormalizationUpdates(postDeleteSnapshot);
      
      if (normalizationResult.hierarchyUpdates.length > 0) {
        console.log(`📋 Phase 4a: Normalizing ${normalizationResult.hierarchyUpdates.length} hierarchy numbers`);
        await bulkUpdateHierarchies.mutateAsync({ 
          updates: normalizationResult.hierarchyUpdates, 
          options: { suppressInvalidate: true } 
        });
        
        // Immediately patch cache with Phase 4 normalization updates
        queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(task => {
            const update = normalizationResult.hierarchyUpdates.find(u => u.id === task.id);
            return update ? { ...task, hierarchy_number: update.hierarchy_number } : task;
          });
        });
      }
      
      if (normalizationResult.predecessorUpdates.length > 0) {
        console.log(`🔗 Phase 4b: Remapping ${normalizationResult.predecessorUpdates.length} predecessor references after normalization`);
        const predecessorNormUpdates = normalizationResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorNormUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 5: Parent recalculation now handled automatically by useTaskMutations batch cascade
      console.log('✅ Phase 5: Parent recalculation will be handled by cascade system');
      
      // Clear selection after successful deletion
      setSelectedTasks(new Set());
      
      toast({ title: "Success", description: `${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} deleted successfully` });
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast({ title: "Error", description: "Failed to delete selected tasks", variant: "destructive" });
    } finally {
      // Clear batch flag and invalidate cache once
      (window as any).__batchOperationInProgress = false;
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  // Handle confirmed deletion (when user chooses to proceed despite dependencies)
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      const taskToDelete = tasks.find(t => t.id === pendingDelete.taskId);
      if (!taskToDelete) return;

      // Use the same multi-phase pipeline as regular deletion
      const { computeDeleteUpdates } = await import('@/utils/deleteTaskLogic');
      const deleteResult = computeDeleteUpdates(taskToDelete, tasks);
      
      console.log(`🗑️ CONFIRM DELETE: ${deleteResult.tasksToDelete.length} tasks to delete, ${deleteResult.hierarchyUpdates.length} hierarchy updates`);
      
      // Set batch operation flag
      (window as any).__batchOperationInProgress = true;

      // Phase 1: Delete all tasks in bulk
      if (deleteResult.tasksToDelete.length > 0) {
        await bulkDeleteTasks.mutateAsync({ 
          taskIds: deleteResult.tasksToDelete, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 2: Bulk update hierarchies
      if (deleteResult.hierarchyUpdates.length > 0) {
        await bulkUpdateHierarchies.mutateAsync({ 
          updates: deleteResult.hierarchyUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 3: Bulk update predecessors
      if (deleteResult.predecessorUpdates.length > 0) {
        const predecessorUpdates = deleteResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 4: Normalize hierarchy to ensure first row is 1
      console.log('🔢 Phase 4: Normalizing hierarchy numbering');
      const { computeNormalizationUpdates } = await import('@/utils/hierarchyNormalization');
      
      // Build post-delete snapshot: current tasks minus deleted ones, plus applied hierarchy updates
      let postDeleteSnapshot = tasks
        .filter(t => !deleteResult.tasksToDelete.includes(t.id))
        .map(t => ({ ...t })); // Deep clone
      
      // Apply Phase 2 hierarchy updates to the snapshot
      deleteResult.hierarchyUpdates.forEach(update => {
        const task = postDeleteSnapshot.find(t => t.id === update.id);
        if (task) {
          task.hierarchy_number = update.hierarchy_number;
        }
      });
      
      console.log(`🔢 Computing normalization from snapshot of ${postDeleteSnapshot.length} tasks`);
      const normalizationResult = computeNormalizationUpdates(postDeleteSnapshot);
      
      if (normalizationResult.hierarchyUpdates.length > 0) {
        console.log(`📋 Phase 4a: Normalizing ${normalizationResult.hierarchyUpdates.length} hierarchy numbers`);
        await bulkUpdateHierarchies.mutateAsync({ 
          updates: normalizationResult.hierarchyUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      if (normalizationResult.predecessorUpdates.length > 0) {
        console.log(`🔗 Phase 4b: Remapping ${normalizationResult.predecessorUpdates.length} predecessor references after normalization`);
        const predecessorNormUpdates = normalizationResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorNormUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Remove from selected tasks if it was selected
      if (selectedTasks.has(pendingDelete.taskId)) {
        const newSelected = new Set(selectedTasks);
        newSelected.delete(pendingDelete.taskId);
        setSelectedTasks(newSelected);
      }
      
      setPendingDelete(null);
      toast({ title: "Success", description: "Task deleted successfully" });
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } finally {
      // Clear batch flag and invalidate cache once
      (window as any).__batchOperationInProgress = false;
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  // Calculate minimum day width to fit entire timeline in viewport
  const calculateMinDayWidth = () => {
    const timelineRange = getTimelineRange();
    const totalDays = getCalendarDaysBetween(timelineRange.start, timelineRange.end);
    const maxDays = Math.min(totalDays, 1095); // Cap for performance
    
    // Assume viewport width is around 800px for timeline panel (rough estimate)
    const viewportWidth = 800;
    const minDayWidthToFit = Math.max(viewportWidth / maxDays, 5); // Minimum 5px per day
    
    return Math.min(minDayWidthToFit, 20); // Don't exceed 20px as previous minimum
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setDayWidth(prev => Math.min(prev + 10, 100)); // Max zoom: 100px per day
  };

  const handleZoomOut = () => {
    const minWidth = calculateMinDayWidth();
    setDayWidth(prev => Math.max(prev - 10, minWidth)); // Min zoom: fit entire timeline or 5px minimum
  };

  // Expand/Collapse handlers
  const handleToggleExpandCollapse = () => {
    // Check if tasks are currently expanded based on expandedTasks state
    if (expandedTasks.size > 0) {
      setCollapseAllTasks(true);
    } else {
      setExpandAllTasks(true);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <p className="text-muted-foreground">Loading schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <p className="text-destructive">Error loading schedule: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Gantt Chart Container */}
      <div className="bg-card text-card-foreground rounded-lg border overflow-hidden flex flex-col flex-1">
        {/* Toolbar */}
        <ScheduleToolbar
          selectedTasks={selectedTasks}
          tasks={tasks}
          projectId={projectId}
          onAddTask={handleAddTask}
          onPublish={() => setShowPublishDialog(true)}
          onCopySchedule={handleCopySchedule}
          allExpanded={expandedTasks.size > 0}
          onToggleExpandCollapse={handleToggleExpandCollapse}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
        
        <UnifiedScheduleTable
          tasks={tasks}
          visibleTasks={visibleTasks}
          expandedTasks={expandedTasks}
          onToggleExpand={handleToggleExpand}
          onTaskUpdate={handleTaskUpdate}
          selectedTasks={selectedTasks}
          onSelectedTasksChange={setSelectedTasks}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onAddAbove={handleAddAbove}
          onAddBelow={handleAddBelow}
          onDeleteTask={handleDeleteTask}
          onBulkDelete={handleBulkDelete}
          onDragDrop={handleDragDrop}
          startDate={timelineStart}
          endDate={timelineEnd}
          dayWidth={dayWidth}
        />
      </div>

      {/* DISABLED: AddTaskDialog during refactoring - using simple add instead */}
      {/* <AddTaskDialog 
        projectId={projectId}
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
      /> */}

      {/* Publish Dialog */}
      <PublishScheduleDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onPublish={(data) => {
          // Handle publish logic here
          console.log("Publishing schedule with data:", data);
          toast({ title: "Success", description: "Schedule published successfully" });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task with Dependencies</AlertDialogTitle>
            <AlertDialogDescription>
              This task is a prerequisite for {pendingDelete?.dependentTasks.length} other task(s):
              <ul className="mt-2 list-disc list-inside">
                {pendingDelete?.dependentTasks.map((task, index) => (
                  <li key={index} className="text-sm">
                    {task.hierarchy_number}: {task.task_name}
                  </li>
                ))}
              </ul>
              <br />
              Deleting this task will remove these dependencies. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CopyScheduleDialog
        isOpen={showCopyScheduleDialog}
        onClose={() => setShowCopyScheduleDialog(false)}
        currentProjectId={projectId}
        onCopySchedule={handleCopyScheduleSubmit}
      />

    </div>
  );
}