import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { getTasksWithDependency } from "@/utils/predecessorValidation";
import { computeDeleteUpdates, computeBulkDeleteUpdates } from "@/utils/deleteTaskLogic";

interface UseTaskDeleteParams {
  projectId: string;
  tasks: ProjectTask[];
  selectedTasks: Set<string>;
  setSelectedTasks: (tasks: Set<string>) => void;
  hasChildren: (taskId: string) => boolean;
  recalculateParentHierarchy: (hierarchyNumber: string) => void;
  captureState: (tasks: ProjectTask[]) => void;
  bulkDeleteTasks: {
    mutateAsync: (params: { taskIds: string[]; options?: { suppressInvalidate?: boolean } }) => Promise<any>;
  };
  bulkUpdateHierarchies: {
    mutateAsync: (params: { 
      updates: { id: string; hierarchy_number: string }[]; 
      originalTasks?: ProjectTask[];
      ordered?: boolean;
      options?: { suppressInvalidate?: boolean } 
    }) => Promise<any>;
  };
  bulkUpdatePredecessors: {
    mutateAsync: (params: { 
      updates: { id: string; predecessor: string[] }[]; 
      options?: { suppressInvalidate?: boolean; skipValidation?: boolean } 
    }) => Promise<any>;
  };
  queryClient: QueryClient;
  user: { id: string } | null;
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

interface PendingDelete {
  taskId: string;
  dependentTasks: ProjectTask[];
}

interface PendingBulkDelete {
  taskIds: string[];
  dependentTasks: ProjectTask[];
}

export function useTaskDelete({
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
}: UseTaskDeleteParams) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<PendingBulkDelete | null>(null);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Handle single task delete with 5-phase pipeline
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

    // Capture state for undo before deletion
    captureState(tasks);

    try {
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
          
          // Build a map of task id -> new hierarchy number for self-reference prevention
          const hierarchyMap = new Map<string, string>();
          deleteResult.hierarchyUpdates.forEach(u => hierarchyMap.set(u.id, u.hierarchy_number));
          
          // Filter out self-references as a safety net
          const predecessorUpdates = deleteResult.predecessorUpdates.map(update => {
            const newHierarchy = hierarchyMap.get(update.taskId) || tasks.find(t => t.id === update.taskId)?.hierarchy_number;
            
            // Filter out any predecessor that would point to itself
            const safePredecessors = update.newPredecessors.filter(pred => {
              const predHierarchy = pred.replace(/[+-]\d+$/, '').replace(/(FS|SS|SF|FF)$/i, '');
              return predHierarchy !== newHierarchy;
            });
            
            return {
              id: update.taskId,
              predecessor: safePredecessors
            };
          });
          
          await bulkUpdatePredecessors.mutateAsync({ 
            updates: predecessorUpdates, 
            options: { suppressInvalidate: true, skipValidation: true } 
          });
          console.log('✅ Phase 3 completed successfully');
        } catch (error) {
          console.error('❌ Phase 3 (Predecessor Updates) failed:', error);
          console.error('Failed updates:', deleteResult.predecessorUpdates);
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
            options: { suppressInvalidate: true, skipValidation: true } 
          });
        }
        console.log('✅ Phase 4 completed successfully');
      } catch (error) {
        console.error('❌ Phase 4 (Normalization) failed:', error);
        toast({ title: "Error", description: `Failed to delete task - Phase 4: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
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
        toast({ title: "Error", description: `Task deleted but parent date recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      }
      
      // Remove from selected tasks if it was selected
      if (selectedTasks.has(taskId)) {
        const newSelected = new Set(selectedTasks);
        newSelected.delete(taskId);
        setSelectedTasks(newSelected);
      }
      
      toast({ title: "Success", description: "Task deleted successfully" });
    } catch (error: any) {
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

    setIsDeletingBulk(true);

    // Capture state for undo before deletion
    captureState(tasks);

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
          setIsDeletingBulk(false);
          toast({ title: "Error", description: "Cannot delete parent task - select all child tasks first or delete child tasks individually", variant: "destructive" });
          return;
        }
      }
    }

    // Check for dependencies across all selected tasks
    const dependentTasks: ProjectTask[] = [];
    
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
      setIsDeletingBulk(false);
      // Show modal instead of blocking with toast
      setPendingBulkDelete({ 
        taskIds: selectedTaskIds, 
        dependentTasks: dependentTasks 
      });
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
      
      toast({ title: "Success", description: `${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} deleted successfully` });
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast({ title: "Error", description: "Failed to delete selected tasks", variant: "destructive" });
    } finally {
      // Clear batch flag and invalidate cache once
      setIsDeletingBulk(false);
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
          options: { suppressInvalidate: true, skipValidation: true } 
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
          options: { suppressInvalidate: true, skipValidation: true } 
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

  // Handle confirmed bulk deletion (when user chooses to proceed despite dependencies)
  const handleConfirmBulkDelete = async () => {
    if (!pendingBulkDelete) return;

    setIsDeletingBulk(true);
    
    try {
      const selectedTaskIds = pendingBulkDelete.taskIds;
      
      // First, remove predecessor references from dependent tasks
      console.log(`🔗 Removing dependencies from ${pendingBulkDelete.dependentTasks.length} dependent tasks`);
      
      const predecessorClearUpdates = pendingBulkDelete.dependentTasks.map(depTask => {
        // Parse current predecessors and filter out the ones being deleted
        const currentPreds = Array.isArray(depTask.predecessor) 
          ? depTask.predecessor 
          : (depTask.predecessor ? [depTask.predecessor] : []);
        
        // Get hierarchy numbers of tasks being deleted
        const deletingHierarchies = selectedTaskIds
          .map(id => tasks.find(t => t.id === id)?.hierarchy_number)
          .filter(Boolean);
        
        // Filter out predecessors that reference deleted tasks
        const newPreds = currentPreds.filter((pred: string) => {
          const predBase = pred.replace(/\s*(SS|SF|FF|FS)?(\s*[+-]\d+d?)?$/i, '').trim();
          return !deletingHierarchies.includes(predBase);
        });
        
        return {
          id: depTask.id,
          predecessor: newPreds
        };
      });
      
      if (predecessorClearUpdates.length > 0) {
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorClearUpdates, 
          options: { suppressInvalidate: true, skipValidation: true } 
        });
      }
      
      // Now proceed with deletion using the same logic as handleBulkDelete
      const deleteResult = computeBulkDeleteUpdates(selectedTaskIds, tasks);
      
      console.log(`🚀 Starting bulk delete of ${deleteResult.tasksToDelete.length} tasks after removing dependencies`);
      
      // Set batch operation flag
      (window as any).__batchOperationInProgress = true;
      
      // Phase 1: Bulk delete all tasks
      if (deleteResult.tasksToDelete.length > 0) {
        await bulkDeleteTasks.mutateAsync({ 
          taskIds: deleteResult.tasksToDelete, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 2: Bulk update hierarchies if needed
      if (deleteResult.hierarchyUpdates.length > 0) {
        await bulkUpdateHierarchies.mutateAsync({ 
          updates: deleteResult.hierarchyUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Phase 3: Bulk update predecessors if needed
      if (deleteResult.predecessorUpdates.length > 0) {
        const predecessorUpdates = deleteResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorUpdates, 
          options: { suppressInvalidate: true, skipValidation: true } 
        });
      }
      
      // Phase 4: Normalize hierarchy
      const { computeNormalizationUpdates } = await import('@/utils/hierarchyNormalization');
      
      let postDeleteSnapshot = tasks
        .filter(t => !deleteResult.tasksToDelete.includes(t.id))
        .map(t => ({ ...t }));
      
      deleteResult.hierarchyUpdates.forEach(update => {
        const task = postDeleteSnapshot.find(t => t.id === update.id);
        if (task) {
          task.hierarchy_number = update.hierarchy_number;
        }
      });
      
      const normalizationResult = computeNormalizationUpdates(postDeleteSnapshot);
      
      if (normalizationResult.hierarchyUpdates.length > 0) {
        await bulkUpdateHierarchies.mutateAsync({ 
          updates: normalizationResult.hierarchyUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      if (normalizationResult.predecessorUpdates.length > 0) {
        const predecessorNormUpdates = normalizationResult.predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorNormUpdates, 
          options: { suppressInvalidate: true, skipValidation: true } 
        });
      }
      
      // Clear selection
      setSelectedTasks(new Set());
      setPendingBulkDelete(null);
      toast({ title: "Success", description: `${selectedTaskIds.length} task(s) deleted successfully` });
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast({ title: "Error", description: `Failed to delete tasks: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
      (window as any).__batchOperationInProgress = false;
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  return {
    // State
    pendingDelete,
    pendingBulkDelete,
    isDeletingBulk,
    
    // Actions
    handleDeleteTask,
    handleBulkDelete,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    clearPendingDelete: () => setPendingDelete(null),
    clearPendingBulkDelete: () => setPendingBulkDelete(null),
  };
}
