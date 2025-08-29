import React, { useState, useEffect } from "react";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateParentTaskValues, shouldUpdateParentTask } from "@/utils/taskCalculations";
import { DateString, today, addDays, addBusinessDays, getNextBusinessDay, isBusinessDay, calculateBusinessEndDate, getCalendarDaysBetween, ensureBusinessDay, formatYMD } from "@/utils/dateOnly";
import { TaskTable } from "./TaskTable";
import { Timeline } from "./Timeline";
import { AddTaskDialog } from "./AddTaskDialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { CopyScheduleDialog } from "./CopyScheduleDialog";
import { useCopySchedule } from "@/hooks/useCopySchedule";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { getTasksWithDependency } from "@/utils/predecessorValidation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// Simplified hierarchy imports - only basic functions
import { getLevel, generateIndentHierarchy, generateIndentUpdates } from "@/utils/hierarchyUtils";
import { computeBulkDeleteUpdates, computeDeleteUpdates } from "@/utils/deleteTaskLogic";

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
  
  // Add flags to prevent infinite loops
  const [isRecalculatingParents, setIsRecalculatingParents] = useState(false);
  const [skipRecalc, setSkipRecalc] = useState(false);
  
  // Listen for parent recalculation events from mutations
  useEffect(() => {
    const handleParentRecalculation = (event: CustomEvent) => {
      const { hierarchyNumber } = event.detail;
      if (hierarchyNumber && !isRecalculatingParents && !skipRecalc) {
        setSkipRecalc(true); // Prevent new events during processing
        setTimeout(() => {
          recalculateParentHierarchy(hierarchyNumber);
          setTimeout(() => setSkipRecalc(false), 1000); // Reset after cooldown
        }, 200);
      }
    };
    
    window.addEventListener('recalculate-parents', handleParentRecalculation as EventListener);
    return () => window.removeEventListener('recalculate-parents', handleParentRecalculation as EventListener);
  }, [isRecalculatingParents, skipRecalc]);

  // Auto-normalize hierarchy on load if needed
  useEffect(() => {
    const autoNormalize = async () => {
      if (!tasks || tasks.length === 0 || (window as any).__batchOperationInProgress) return;
      
      const { needsNormalization, computeNormalizationUpdates } = await import('@/utils/hierarchyNormalization');
      
      if (needsNormalization(tasks)) {
        console.log('🔢 Auto-normalizing hierarchy on load');
        (window as any).__batchOperationInProgress = true;
        
        try {
          const normalizationResult = computeNormalizationUpdates(tasks);
          
          if (normalizationResult.hierarchyUpdates.length > 0) {
            await bulkUpdateHierarchies.mutateAsync({ 
              updates: normalizationResult.hierarchyUpdates, 
              options: { suppressInvalidate: true } 
            });
          }
          
          if (normalizationResult.predecessorUpdates.length > 0) {
            const predecessorUpdates = normalizationResult.predecessorUpdates.map(update => ({
              id: update.taskId,
              predecessor: update.newPredecessors
            }));
            await bulkUpdatePredecessors.mutateAsync({ 
              updates: predecessorUpdates, 
              options: { suppressInvalidate: true } 
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
        } catch (error) {
          console.error('Failed to auto-normalize:', error);
        } finally {
          (window as any).__batchOperationInProgress = false;
        }
      }
    };
    
    // Debounce auto-normalize to prevent rapid-fire calls
    const timeoutId = setTimeout(autoNormalize, 1000);
    return () => clearTimeout(timeoutId);
  }, [tasks, projectId, user?.id]);

  // Debounced parent recalculation when tasks change
  useEffect(() => {
    if (!tasks || tasks.length === 0 || isRecalculatingParents || skipRecalc) return;
    
    const recalculateParents = async () => {
      console.log('🔄 Auto-recalculating parent tasks');
      
      // Find all parent tasks that have children
      const parentTasks = tasks.filter(task => {
        if (!task.hierarchy_number) return false;
        return tasks.some(child => 
          child.hierarchy_number?.startsWith(task.hierarchy_number + '.')
        );
      });
      
      if (parentTasks.length === 0) return;
      
      setIsRecalculatingParents(true);
      
      try {
        for (const parentTask of parentTasks) {
          const calculations = calculateParentTaskValues(parentTask, tasks);
          if (calculations && shouldUpdateParentTask(parentTask, calculations)) {
            console.log(`🔄 Updating parent: ${parentTask.task_name}`, calculations);
            await updateTask.mutateAsync({
              id: parentTask.id,
              start_date: calculations.startDate,
              end_date: calculations.endDate,
              duration: calculations.duration,
              progress: calculations.progress,
              suppressInvalidate: true
            });
          }
        }
        
        // Invalidate queries once at the end
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      } catch (error) {
        console.error('❌ Failed to recalculate parents:', error);
      } finally {
        setIsRecalculatingParents(false);
      }
    };
    
    // Debounce to prevent rapid recalculations
    const timeoutId = setTimeout(recalculateParents, 500);
    return () => clearTimeout(timeoutId);
  }, [tasks, updateTask, queryClient, projectId, user?.id, isRecalculatingParents, skipRecalc]);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showCopyScheduleDialog, setShowCopyScheduleDialog] = useState(false);
  
  // Zoom state for timeline
  const [dayWidth, setDayWidth] = useState(40); // pixels per day
  
  // Debug: Force rebuild to clear any cache issues
  console.log('CustomGanttChart component loaded - no reset dialog references should exist');
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandAllTasks, setExpandAllTasks] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{ taskId: string; dependentTasks: any[] } | null>(null);

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

  const handleTaskMove = async (taskId: string, direction: 'up' | 'down') => {
    if (direction === 'up') {
      // TODO: Implement move up logic
      console.log(`Moving task ${taskId} ${direction}`);
      return;
    }
    
    // Handle move down
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) {
      console.error('❌ Task or user not found for move down');
      return;
    }
    
    // Import the move down logic
    const { computeMoveDownUpdates } = await import("@/utils/moveDownLogic");
    
    // Capture original tasks before any optimistic updates
    const originalTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
    const result = computeMoveDownUpdates(task, originalTasks);
    
    if (result.hierarchyUpdates.length === 0) {
      toast.error("Cannot move this task down");
      return;
    }
    
    try {
      console.log('🔄 Starting move down for task:', task.task_name);
      console.log('📊 Move down updates computed:', {
        hierarchyUpdates: result.hierarchyUpdates.length,
        predecessorUpdates: result.predecessorUpdates.length
      });
      
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
        ordered: true, // Use ordered execution for move operations
        options: { suppressInvalidate: true }
      });
      
      // Apply predecessor updates if needed
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
      
      // Final cache invalidation
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      
      toast.success(`Moved "${task.task_name}" down successfully`);
      
    } catch (error) {
      console.error('❌ Failed to move task down:', error);
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      
      toast.error("Failed to move task down");
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    // Prevent updates to optimistic (unsaved) tasks
    if (taskId.startsWith('optimistic-')) {
      toast.error("Please save the task first before editing");
      return;
    }
    
    try {
      await updateTask.mutateAsync({
        id: taskId,
        ...updates
      });
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleIndent = async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    // Import the new function
    const { generateIndentUpdates } = await import("@/utils/hierarchyUtils");
    const updates = generateIndentUpdates(task, tasks);
    
    if (updates.length === 0) {
      toast.error("Cannot indent this task");
      return;
    }
    
    try {
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
      
      toast.success("Task indented successfully");
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      toast.error("Failed to indent task");
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
      toast.error("Cannot outdent this task");
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
      
      toast.success("Task outdented successfully");
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      toast.error("Failed to outdent task");
      console.error("Error outdenting task:", error);
    }
  };

  // Comprehensive function to recalculate all parent tasks in a hierarchy
  const recalculateParentHierarchy = (hierarchyNumber: string) => {
    if (!hierarchyNumber || !user || isRecalculatingParents) return;
    
    console.log('🔄 Starting parent hierarchy recalculation for:', hierarchyNumber);
    setIsRecalculatingParents(true);
    
    // Get fresh task data from React Query cache
    const freshTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
    console.log('🔄 Using fresh task data. Total tasks:', freshTasks.length);
    
    // Find all parent levels for this hierarchy (e.g., for "1.2.3" find ["1", "1.2"])
    const hierarchyParts = hierarchyNumber.split('.');
    const parentHierarchies: string[] = [];
    
    for (let i = 1; i < hierarchyParts.length; i++) {
      parentHierarchies.push(hierarchyParts.slice(0, i).join('.'));
    }
    
    console.log('🔄 Parent hierarchies to recalculate:', parentHierarchies);
    
    // Recalculate each parent level from deepest to shallowest
    parentHierarchies.reverse().forEach(parentHierarchy => {
      const parentTask = freshTasks.find(task => task.hierarchy_number === parentHierarchy);
      
      if (parentTask) {
        console.log(`🔄 Recalculating parent task: ${parentTask.task_name} (${parentHierarchy})`);
        
        const calculations = calculateParentTaskValues(parentTask, freshTasks);
        
        if (calculations) {
          console.log(`🔄 Calculated values for ${parentTask.task_name}:`, {
            startDate: calculations.startDate,
            endDate: calculations.endDate,
            duration: calculations.duration,
            progress: calculations.progress,
            currentDuration: parentTask.duration,
            currentEndDate: parentTask.end_date.split('T')[0]
          });
          
          if (shouldUpdateParentTask(parentTask, calculations)) {
            console.log(`✅ Updating parent task: ${parentTask.task_name}`);
            updateTask.mutate({
              id: parentTask.id,
              start_date: calculations.startDate + 'T00:00:00',
              end_date: calculations.endDate + 'T00:00:00',
              duration: calculations.duration,
              progress: calculations.progress,
              suppressInvalidate: true // Prevent infinite loops
            });
          } else {
            console.log(`⏸️ Parent task ${parentTask.task_name} is already up to date`);
          }
        } else {
          console.log(`⚠️ No calculations available for parent task: ${parentTask.task_name}`);
        }
      } else {
        console.log(`⚠️ Parent task not found for hierarchy: ${parentHierarchy}`);
      }
    });
    
    // Reset the flag after completion
    setTimeout(() => setIsRecalculatingParents(false), 500);
  };

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
      
      toast.success("Group added successfully");
    } catch (error) {
      console.error("Failed to add group:", error);
      toast.error("Failed to add group");
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
        toast.error("Invalid task selected");
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
        // Use original tasks to avoid cache collision
        await bulkUpdateHierarchies.mutateAsync({
          updates: hierarchyUpdates,
          originalTasks,
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
      toast.success("Task added above successfully");
    } catch (error) {
      console.error("❌ Add Above operation failed:", error);
      
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to add task above: ${errorMessage}`);
    } finally {
      // Clear batch operation flag
      (window as any).__batchOperationInProgress = false;
    }
  };

  // DISABLED: Add below functionality
  const handleAddBelow = async (relativeTaskId: string) => {
    toast.info("Add below temporarily disabled - use Add Above instead");
  };

  // Handle single task deletion with dependency check and proper renumbering
  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if task has children - prevent deletion if so
    if (hasChildren(taskId)) {
      toast.error("Cannot delete parent task - delete all child tasks first");
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
        toast.error(`Failed to compute delete updates: ${error instanceof Error ? error.message : String(error)}`);
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
        toast.error(`Failed to delete task - Phase 1: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          toast.error(`Failed to delete task - Phase 2: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          toast.error(`Task deleted but some predecessor references may need manual cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        toast.error(`Failed to delete task - Phase 4: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
      
      // Phase 5: Recalculate affected task dates and parent groups
      try {
        console.log(`🔄 Phase 5: Recalculating ${deleteResult.parentGroupsToRecalculate.length} parent groups`);
        for (const parentHierarchy of deleteResult.parentGroupsToRecalculate) {
          recalculateParentHierarchy(parentHierarchy);
        }
        console.log('✅ Phase 5 completed successfully');
      } catch (error) {
        console.error('❌ Phase 5 (Parent Recalculation) failed:', error);
        // Don't throw - deletion is essentially complete at this point
        console.log('⚠️ Task deleted successfully but parent recalculation failed');
        toast.error(`Task deleted but parent date recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Remove from selected tasks if it was selected
      if (selectedTasks.has(taskId)) {
        const newSelected = new Set(selectedTasks);
        newSelected.delete(taskId);
        setSelectedTasks(newSelected);
      }
      
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      // Generic fallback if specific phase error handling didn't catch it
      if (!error.message?.includes('Phase')) {
        toast.error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      toast.error("No tasks selected");
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
          toast.error("Cannot delete parent task - select all child tasks first or delete child tasks individually");
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
      toast.error(`Cannot delete tasks: ${dependentTasks.length} other task(s) depend on selected tasks`);
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
      
      // Phase 5: Recalculate affected task dates and parent groups
      console.log(`🔄 Phase 5: Recalculating ${deleteResult.parentGroupsToRecalculate.length} parent groups`);
      for (const parentHierarchy of deleteResult.parentGroupsToRecalculate) {
        recalculateParentHierarchy(parentHierarchy);
      }
      
      // Clear selection after successful deletion
      setSelectedTasks(new Set());
      
      toast.success(`${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} deleted successfully`);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast.error("Failed to delete selected tasks");
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
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
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
    <div className="space-y-4">
      {/* Gantt Chart Container */}
      <div className="bg-card text-card-foreground rounded-lg border overflow-hidden">
        {/* Toolbar */}
        <ScheduleToolbar
          selectedTasks={selectedTasks}
          tasks={tasks}
          projectId={projectId}
          onAddTask={handleAddTask}
          onPublish={() => setShowPublishDialog(true)}
          onCopySchedule={handleCopySchedule}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
        
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
          {/* Left Side - Task Table */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
        <TaskTable
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
          onMoveUp={(taskId) => handleTaskMove(taskId, 'up')}
          onMoveDown={(taskId) => handleTaskMove(taskId, 'down')}
        />
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle />

          {/* Right Side - Timeline */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <Timeline
              tasks={visibleTasks}
              startDate={timelineStart}
              endDate={timelineEnd}
              onTaskUpdate={handleTaskUpdate}
              dayWidth={dayWidth}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
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
          toast.success("Schedule published successfully");
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