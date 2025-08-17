import React, { useState, useEffect } from "react";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { calculateParentTaskValues, shouldUpdateParentTask } from "@/utils/taskCalculations";
import { TaskTable } from "./TaskTable";
import { Timeline } from "./Timeline";
import { AddTaskDialog } from "./AddTaskDialog";
import { PublishScheduleDialog } from "./PublishScheduleDialog";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { toast } from "sonner";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { getTasksWithDependency } from "@/utils/predecessorValidation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// Simplified hierarchy imports - only basic functions
import { getLevel, generateIndentHierarchy, generateIndentUpdates } from "@/utils/hierarchyUtils";
import { computeBulkDeleteUpdates } from "@/utils/deleteTaskLogic";

interface CustomGanttChartProps {
  projectId: string;
}

export function CustomGanttChart({ projectId }: CustomGanttChartProps) {
  const { data: tasks = [], isLoading, error } = useProjectTasks(projectId);
  const { updateTask, createTask, deleteTask } = useTaskMutations(projectId);
  const { bulkUpdateHierarchies, bulkUpdatePredecessors } = useTaskBulkMutations(projectId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Listen for parent recalculation events from mutations
  useEffect(() => {
    const handleParentRecalculation = (event: CustomEvent) => {
      const { hierarchyNumber } = event.detail;
      if (hierarchyNumber) {
        // Add delay to ensure React Query cache is refreshed with latest data
        setTimeout(() => {
          recalculateParentHierarchy(hierarchyNumber);
        }, 100);
      }
    };
    
    window.addEventListener('recalculate-parents', handleParentRecalculation as EventListener);
    return () => window.removeEventListener('recalculate-parents', handleParentRecalculation as EventListener);
  }, []);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
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

  // Calculate timeline range from ALL task dates (not just visible ones) using actual end dates
  const parseDate = (dateStr: string): Date => {
    // Extract just the date part (YYYY-MM-DD) and use the same logic as TaskRow
    const datePart = dateStr.split('T')[0].split(' ')[0];
    return new Date(datePart + "T12:00:00");
  };

  const timelineStart = tasks.length > 0 
    ? new Date(Math.min(...tasks.map(t => parseDate(t.start_date).getTime())))
    : new Date();
  
  const timelineEnd = tasks.length > 0
    ? new Date(Math.max(...tasks.map(t => parseDate(t.end_date).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now


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

  // DISABLED: Task move functionality - will be reimplemented later
  const handleTaskMove = async (taskId: string, direction: 'up' | 'down') => {
    toast.info("Task movement temporarily disabled during refactoring");
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
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
    if (!task || !tasks) return;
    
    // Import the new function
    const { generateIndentUpdates } = await import("@/utils/hierarchyUtils");
    const updates = generateIndentUpdates(task, tasks);
    
    if (updates.length === 0) {
      toast.error("Cannot indent this task");
      return;
    }
    
    try {
      // Apply all updates in batch
      for (const update of updates) {
        await updateTask.mutateAsync({
          id: update.id,
          hierarchy_number: update.hierarchy_number
        });
      }
      
      // Expand all tasks after successful indent
      setExpandAllTasks(true);
      
      toast.success("Task indented successfully");
    } catch (error) {
      toast.error("Failed to indent task");
      console.error("Error indenting task:", error);
    }
  };

  // DISABLED: Outdent functionality - will be reimplemented step by step
  const handleOutdent = async (taskId: string) => {
    toast.info("Outdent functionality temporarily disabled during refactoring");
  };

  // Comprehensive function to recalculate all parent tasks in a hierarchy
  const recalculateParentHierarchy = (hierarchyNumber: string) => {
    if (!hierarchyNumber || !user) return;
    
    console.log('🔄 Starting parent hierarchy recalculation for:', hierarchyNumber);
    
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
            handleTaskUpdate(parentTask.id, {
              start_date: calculations.startDate,
              end_date: calculations.endDate,
              duration: calculations.duration,
              progress: calculations.progress
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
      
      // Import business day utilities
      const { ensureBusinessDay, calculateBusinessEndDate, formatYMD } = await import('@/utils/businessDays');
      
      // Start on next business day if today is weekend
      const startDate = ensureBusinessDay(new Date());
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

      // Create optimistic task immediately with business day logic
      const { ensureBusinessDay, calculateBusinessEndDate, formatYMD } = await import('@/utils/businessDays');
      const startDate = ensureBusinessDay(new Date());
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
        updated_at: new Date().toISOString(),
        confirmed: false, // Mark as optimistic
      };

      // Immediately update the cache with optimistic data
      queryClient.setQueryData(['project-tasks', projectId], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [optimisticTask];
        
        // Apply hierarchy updates optimistically
        const updatedTasks = oldData.map(task => {
          const hierarchyUpdate = hierarchyUpdates.find(u => u.id === task.id);
          const predecessorUpdate = predecessorUpdates.find(u => u.taskId === task.id);
          
          return {
            ...task,
            ...(hierarchyUpdate && { hierarchy_number: hierarchyUpdate.hierarchy_number }),
            ...(predecessorUpdate && { predecessor: JSON.stringify(predecessorUpdate.newPredecessors) })
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

      // Phase 1: Bulk hierarchy updates
      if (hierarchyUpdates.length > 0) {
        console.log("🔄 Phase 1: Bulk hierarchy updates");
        await bulkUpdateHierarchies.mutateAsync(hierarchyUpdates);
      }

      // Phase 2: Bulk predecessor updates 
      if (predecessorUpdates.length > 0) {
        console.log("🔄 Phase 2: Bulk predecessor updates");
        const predecessorBulkUpdates = predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: JSON.stringify(update.newPredecessors)
        }));
        await bulkUpdatePredecessors.mutateAsync(predecessorBulkUpdates);
      }

      // Phase 3: Create the actual task
      console.log("🔄 Phase 3: Creating new task");
      
      // Use same business day logic as optimistic task
      const startString = formatYMD(startDate) + 'T00:00:00';
      const endString = formatYMD(endDate) + 'T00:00:00';

      const newTask = await createTask.mutateAsync({
        project_id: projectId,
        task_name: 'New Task',
        start_date: startString,
        end_date: endString,
        duration: 1,
        progress: 0,
        hierarchy_number: newTaskHierarchy
      });

      // Replace optimistic task with real task
      queryClient.setQueryData(['project-tasks', projectId], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [newTask];
        return oldData.map(task => 
          task.id === optimisticTask.id ? newTask : task
        );
      });

      console.log("✅ Add Above operation completed successfully");
      toast.success("Task added above successfully");
    } catch (error) {
      console.error("❌ Add Above operation failed:", error);
      
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.error("Failed to add task above");
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
      const deleteResult = computeDeleteUpdates(task, tasks);
      
      console.log(`🗑️ DELETE OPERATION: ${deleteResult.tasksToDelete.length} tasks to delete, ${deleteResult.hierarchyUpdates.length} hierarchy updates, ${deleteResult.predecessorUpdates.length} predecessor updates`);
      
      // Phase 1: Delete all tasks
      console.log('🔄 Phase 1: Deleting tasks');
      for (const taskToDeleteId of deleteResult.tasksToDelete) {
        await deleteTask.mutateAsync(taskToDeleteId);
      }
      
      // Phase 2: Apply hierarchy renumbering (ascending order is safe after deletion)
      console.log(`🔄 Phase 2: Applying ${deleteResult.hierarchyUpdates.length} hierarchy updates`);
      for (const update of deleteResult.hierarchyUpdates) {
        console.log('🔧 Updating task hierarchy:', update.id, '->', update.hierarchy_number);
        await updateTask.mutateAsync({
          id: update.id,
          hierarchy_number: update.hierarchy_number
        });
      }
      
      // Phase 3: Clean up predecessors
      console.log(`🔄 Phase 3: Cleaning up ${deleteResult.predecessorUpdates.length} predecessor references`);
      for (const update of deleteResult.predecessorUpdates) {
        await updateTask.mutateAsync({
          id: update.taskId,
          predecessor: JSON.stringify(update.newPredecessors)
        });
      }
      
      // Phase 4: Recalculate parent groups
      console.log(`🔄 Phase 4: Recalculating ${deleteResult.parentGroupsToRecalculate.length} parent groups`);
      for (const parentHierarchy of deleteResult.parentGroupsToRecalculate) {
        recalculateParentHierarchy(parentHierarchy);
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
      toast.error("Failed to delete task");
    }
  };

  // Handle bulk delete for multiple selected tasks with dependency check
  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) {
      toast.error("No tasks selected");
      return;
    }

    // Check for dependencies across all selected tasks
    const selectedTaskIds = Array.from(selectedTasks);
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
      
      console.log(`🚀 Starting bulk delete of ${deleteResult.tasksToDelete.length} tasks`);
      
      // Phase 1: Delete all tasks in parallel
      console.log(`🗑️ Phase 1: Deleting ${deleteResult.tasksToDelete.length} tasks`);
      const deletePromises = deleteResult.tasksToDelete.map(taskId => 
        deleteTask.mutateAsync(taskId)
      );
      await Promise.all(deletePromises);
      
      // Phase 2: Bulk update hierarchies if needed
      if (deleteResult.hierarchyUpdates.length > 0) {
        console.log(`📋 Phase 2: Bulk updating ${deleteResult.hierarchyUpdates.length} task hierarchies`);
        await bulkUpdateHierarchies.mutateAsync(deleteResult.hierarchyUpdates);
      }
      
      // Phase 3: Bulk update predecessors if needed
      if (deleteResult.predecessorUpdates.length > 0) {
        console.log(`🔗 Phase 3: Bulk updating ${deleteResult.predecessorUpdates.length} task predecessors`);
        const predecessorUpdates = deleteResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync(predecessorUpdates);
      }
      
      // Phase 4: Recalculate parent groups
      console.log(`🔄 Phase 4: Recalculating ${deleteResult.parentGroupsToRecalculate.length} parent groups`);
      for (const parentHierarchy of deleteResult.parentGroupsToRecalculate) {
        recalculateParentHierarchy(parentHierarchy);
      }
      
      // Clear selection after successful deletion
      setSelectedTasks(new Set());
      
      toast.success(`${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} deleted successfully`);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast.error("Failed to delete selected tasks");
    }
  };

  // Handle confirmed deletion (when user chooses to proceed despite dependencies)
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      const taskToDelete = tasks.find(t => t.id === pendingDelete.taskId);
      await deleteTask.mutateAsync(pendingDelete.taskId);
      
      // Remove from selected tasks if it was selected
      if (selectedTasks.has(pendingDelete.taskId)) {
        const newSelected = new Set(selectedTasks);
        newSelected.delete(pendingDelete.taskId);
        setSelectedTasks(newSelected);
      }
      
      // Recalculate parent hierarchy after confirmed deletion
      if (taskToDelete?.hierarchy_number) {
        recalculateParentHierarchy(taskToDelete.hierarchy_number);
      }
      
      setPendingDelete(null);
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
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
    </div>
  );
}