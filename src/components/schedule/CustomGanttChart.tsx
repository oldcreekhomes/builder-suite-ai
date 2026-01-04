import React, { useState, useEffect, useRef } from "react";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";

import { useOptimizedRealtime } from "@/hooks/useOptimizedRealtime";
import { useRecalculateSchedule } from "@/hooks/useRecalculateSchedule";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateParentTaskValues, shouldUpdateParentTask, calculateTaskDatesFromPredecessors } from "@/utils/taskCalculations";
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
import { getTasksWithDependency, validateStartDateAgainstPredecessors } from "@/utils/predecessorValidation";
import { addPendingUpdate } from "@/hooks/useProjectTasks";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useScheduleUndo } from "@/hooks/useScheduleUndo";
import { useTaskDelete } from "@/hooks/useTaskDelete";
import { useTaskAdd } from "@/hooks/useTaskAdd";
import { useTaskHierarchy } from "@/hooks/useTaskHierarchy";

interface CustomGanttChartProps {
  projectId: string;
}

export function CustomGanttChart({ projectId }: CustomGanttChartProps) {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { updateTask, createTask, deleteTask } = useTaskMutations(projectId);
  const { bulkDeleteTasks, bulkUpdateHierarchies, bulkUpdatePredecessors } = useTaskBulkMutations(projectId);
  const copyScheduleMutation = useCopySchedule();
  const recalculateSchedule = useRecalculateSchedule();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { captureState, undo, canUndo, isUndoing } = useScheduleUndo(projectId, user?.id);
  
  // Parent recalculation is now handled directly in useTaskMutations.tsx
  // This eliminates the 3-second cooldown and 1.5-second debounce that caused lag
  // AUTO-NORMALIZE ON LOAD REMOVED - was causing hierarchy corruption by collapsing all children under one parent
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showCopyScheduleDialog, setShowCopyScheduleDialog] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  
  // Zoom state for timeline
  const [dayWidth, setDayWidth] = useState(40); // pixels per day
  
  // Debug: Force rebuild to clear any cache issues  
  console.log('CustomGanttChart component loaded and race condition fixes applied');
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandAllTasks, setExpandAllTasks] = useState(false);
  const [collapseAllTasks, setCollapseAllTasks] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  
  // Performance optimization states
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatingTasks, setCalculatingTasks] = useState<Set<string>>(new Set());

  // Use optimized realtime hook for performance
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
    // Simple fallback if no tasks
    if (!tasks || tasks.length === 0) {
      const todayStr = today();
      return {
        start: todayStr,
        end: addBusinessDays(todayStr, 30)
      };
    }

    // Get all valid dates from tasks
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

    // Fallback if no valid dates
    if (validDates.length === 0) {
      const todayStr = today();
      return {
        start: todayStr,
        end: addBusinessDays(todayStr, 30)
      };
    }

    // Simple: earliest date to latest date + 5 business days
    const minDate = validDates.reduce((min, current) => current < min ? current : min);
    const maxDate = validDates.reduce((max, current) => current > max ? current : max);

    return {
      start: minDate,
      end: addBusinessDays(maxDate, 5)
    };
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
    
    // Capture state for undo
    captureState(originalTasks);
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
      
      // Predecessors are NOT updated during drag-drop - they stay as-is
      // This matches competitor software behavior where only task numbers change
      // and users can see/fix any resulting dependency issues in the Gantt chart
      
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

  // Track recently saved tasks for visual flash feedback
  const [recentlySavedTasks, setRecentlySavedTasks] = useState<Set<string>>(new Set());

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
    
    // Capture state for undo before making changes
    captureState(currentTasks);
    
    // Validate start date against predecessor end dates BEFORE any updates
    if (updates.start_date) {
      const taskToValidate = currentTasks.find(t => t.id === taskId);
      if (taskToValidate && taskToValidate.predecessor) {
        const validation = validateStartDateAgainstPredecessors(taskToValidate, updates.start_date, currentTasks);
        
        if (!validation.isValid) {
          toast({
            title: "Invalid Start Date",
            description: validation.error,
            variant: "destructive"
          });
          return false; // Stop the update entirely
        }
      }
    }
    
    // Build mutation data with computed end_date
    const mutationData: any = {
      id: taskId,
      suppressInvalidate: true
    };
    
    let computedEndDate: string | null = null;
    let computedDuration: number | null = null;
    
    const optimisticTasks = currentTasks.map(task => {
      if (task.id === taskId) {
        const optimisticTask = { ...task };
        
        // Apply updates and normalize dates
        if (updates.start_date) {
          optimisticTask.start_date = updates.start_date.split('T')[0] + 'T00:00:00';
          mutationData.start_date = updates.start_date;
        }
        if (updates.end_date) {
          optimisticTask.end_date = updates.end_date.split('T')[0] + 'T00:00:00';
          mutationData.end_date = updates.end_date;
        }
        if (updates.duration !== undefined) {
          optimisticTask.duration = updates.duration;
          mutationData.duration = updates.duration;
        }
        if (updates.task_name !== undefined) {
          optimisticTask.task_name = updates.task_name;
          mutationData.task_name = updates.task_name;
        }
        if (updates.progress !== undefined) {
          optimisticTask.progress = updates.progress;
          mutationData.progress = updates.progress;
        }
        if (updates.resources !== undefined) {
          optimisticTask.resources = updates.resources;
          mutationData.resources = updates.resources;
        }
        if (updates.predecessor !== undefined) {
          optimisticTask.predecessor = updates.predecessor;
          mutationData.predecessor = updates.predecessor;
          
          // Recalculate this task's dates based on new predecessor
          if (updates.predecessor && updates.predecessor.length > 0) {
            const taskWithNewPredecessor = { ...optimisticTask };
            const dateUpdate = calculateTaskDatesFromPredecessors(taskWithNewPredecessor, currentTasks);
            
            if (dateUpdate) {
              optimisticTask.start_date = dateUpdate.startDate + 'T00:00:00';
              optimisticTask.end_date = dateUpdate.endDate + 'T00:00:00';
              optimisticTask.duration = dateUpdate.duration;
              
              mutationData.start_date = dateUpdate.startDate;
              mutationData.end_date = dateUpdate.endDate;
              mutationData.duration = dateUpdate.duration;
            }
          }
        }
        if (updates.notes !== undefined) {
          optimisticTask.notes = updates.notes;
          mutationData.notes = updates.notes;
        }
        
        // Always keep start/end/duration in sync for instant UI feedback
        
        // If start_date changed and end_date not provided, compute end_date
        if (updates.start_date && !updates.end_date) {
          const currentDuration = optimisticTask.duration || 1;
          const startYmd = optimisticTask.start_date.split('T')[0];
          const endYmd = calculateBusinessEndDate(startYmd as DateString, currentDuration);
          optimisticTask.end_date = endYmd + 'T00:00:00';
          computedEndDate = endYmd;
        }
        
        // If duration changed and end_date not provided, compute end_date
        if (updates.duration !== undefined && !updates.end_date) {
          const startYmd = optimisticTask.start_date.split('T')[0];
          const endYmd = calculateBusinessEndDate(startYmd as DateString, updates.duration);
          optimisticTask.end_date = endYmd + 'T00:00:00';
          computedEndDate = endYmd;
        }
        
        // If end_date changed, recompute duration
        if (updates.end_date) {
          const startYmd = optimisticTask.start_date.split('T')[0];
          const endYmd = optimisticTask.end_date.split('T')[0];
          optimisticTask.duration = getBusinessDaysBetween(startYmd as DateString, endYmd as DateString);
          computedDuration = optimisticTask.duration;
        }
        
        return optimisticTask;
      }
      return task;
    });
    
    // CRITICAL: Include computed end_date in mutation to persist it to database
    if (computedEndDate && !mutationData.end_date) {
      mutationData.end_date = computedEndDate;
    }
    // Also include computed duration when end_date changed
    if (computedDuration !== null && mutationData.duration === undefined) {
      mutationData.duration = computedDuration;
    }
    
    // Apply optimistic update immediately
    queryClient.setQueryData(['project-tasks', projectId, user?.id], optimisticTasks);
    
    // Add to pending updates to ignore real-time echoes (longer TTL for cascades)
    addPendingUpdate(taskId, 6000); // 6s TTL to cover cascade processing
    
    // Visual flash feedback - add task to recently saved set
    setRecentlySavedTasks(prev => new Set(prev).add(taskId));
    setTimeout(() => {
      setRecentlySavedTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 500); // Flash duration
    
    console.log('📤 Sending mutation with data:', mutationData);
    
    // Fire-and-forget mutation (async cascade will refresh cache when complete)
    updateTask.mutate(mutationData);
    
    // Instant success feedback (removed toast for cleaner UX - flash is sufficient)
    return true; // Update was accepted
  };

  // Use the extracted hierarchy hook
  const {
    handleIndent,
    handleOutdent,
    recalculateParentHierarchy,
  } = useTaskHierarchy({
    projectId,
    tasks,
    setExpandAllTasks,
    captureState,
    updateTask,
    bulkUpdateHierarchies,
    bulkUpdatePredecessors,
    queryClient,
    user,
    toast,
  });

  // Use the extracted delete hook
  const {
    pendingDelete,
    pendingBulkDelete,
    isDeletingBulk,
    handleDeleteTask,
    handleBulkDelete,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    clearPendingDelete,
    clearPendingBulkDelete,
  } = useTaskDelete({
    projectId,
    tasks,
    selectedTasks,
    setSelectedTasks,
    hasChildren,
    recalculateParentHierarchy,
    captureState,
    bulkDeleteTasks,
    bulkUpdateHierarchies,
    bulkUpdatePredecessors,
    queryClient,
    user,
    toast,
  });

  // Use the extracted add hook
  const {
    handleAddTask,
    handleAddAbove,
    handleAddBelow,
  } = useTaskAdd({
    projectId,
    tasks,
    captureState,
    createTask,
    bulkUpdateHierarchies,
    bulkUpdatePredecessors,
    queryClient,
    user,
    toast,
  });

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

  // Add functions are now in useTaskAdd hook
  // Delete functions are now in useTaskDelete hook

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

  // Check for corrupted tasks (with __TEMP__ hierarchy numbers or self-referencing predecessors)
  const hasSelfReferencingPredecessors = tasks.some(t => {
    if (!t.predecessor || !t.hierarchy_number) return false;
    const preds = Array.isArray(t.predecessor) ? t.predecessor : [t.predecessor];
    return preds.some(pred => {
      const match = typeof pred === 'string' ? pred.match(/^([\d.]+)/) : null;
      return match && match[1] === t.hierarchy_number;
    });
  });
  const hasCorruptedTasks = tasks.some(t => t.hierarchy_number?.startsWith('__TEMP_')) || hasSelfReferencingPredecessors;

  // Repair schedule handler
  const handleRepairSchedule = async () => {
    if (!user) return;
    setIsRepairing(true);
    try {
      let hierarchyRepairs = 0;
      let deleted = 0;
      let predecessorFixes = 0;

      // Step 1: Fix __TEMP__ hierarchy issues
      const hasHierarchyCorruption = tasks.some(t => t.hierarchy_number?.startsWith('__TEMP_'));
      if (hasHierarchyCorruption) {
        const { data, error } = await supabase.functions.invoke('repair-schedule-hierarchies', {
          body: { projectId, deleteOrphans: true }
        });
        
        if (error) throw error;
        hierarchyRepairs = data.repaired || 0;
        deleted = data.deleted || 0;
      }
      
      // Step 2: Fix self-referencing predecessors
      if (hasSelfReferencingPredecessors) {
        const { data, error } = await supabase.functions.invoke('fix-self-referencing-predecessors', {
          body: { projectId }
        });
        
        if (error) throw error;
        predecessorFixes = data.fixed || 0;
      }
      
      const messages = [];
      if (hierarchyRepairs > 0) messages.push(`Repaired ${hierarchyRepairs} hierarchy issues`);
      if (deleted > 0) messages.push(`Deleted ${deleted} orphans`);
      if (predecessorFixes > 0) messages.push(`Fixed ${predecessorFixes} self-referencing predecessors`);
      
      toast({ 
        title: "Schedule Repaired", 
        description: messages.length > 0 ? messages.join(', ') : 'No issues found'
      });
      
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
    } catch (error: any) {
      console.error('Repair failed:', error);
      toast({ title: "Repair Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsRepairing(false);
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
          onUndo={undo}
          canUndo={canUndo}
          isUndoing={isUndoing}
          onRepairSchedule={handleRepairSchedule}
          isRepairing={isRepairing}
          hasCorruptedTasks={hasCorruptedTasks}
          onBulkDelete={handleBulkDelete}
          isDeleting={isDeletingBulk}
          onRecalculateSchedule={() => recalculateSchedule.mutate({ projectId, tasks })}
          isRecalculating={recalculateSchedule.isPending}
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
          recentlySavedTasks={recentlySavedTasks}
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
      <AlertDialog open={!!pendingDelete} onOpenChange={() => clearPendingDelete()}>
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

      {/* Bulk Delete with Dependencies Confirmation Dialog */}
      <AlertDialog open={!!pendingBulkDelete} onOpenChange={() => clearPendingBulkDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingBulkDelete?.taskIds.length} Task(s) with Dependencies</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>The following task(s) depend on the selected task(s):</p>
                <ul className="mt-2 list-disc list-inside max-h-40 overflow-y-auto">
                  {pendingBulkDelete?.dependentTasks.map((task, index) => (
                    <li key={index} className="text-sm">
                      {task.hierarchy_number}: {task.task_name}
                    </li>
                  ))}
                </ul>
                <p className="mt-3">Deleting will remove these dependencies. Do you want to continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Dependencies & Delete
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