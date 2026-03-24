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

/**
 * Executes the 3-phase delete pipeline:
 * Phase 1: Bulk delete tasks
 * Phase 2: Bulk update hierarchies
 * Phase 3: Bulk update predecessors
 */
async function executeDeletePipeline(
  deleteResult: ReturnType<typeof computeDeleteUpdates>,
  tasks: ProjectTask[],
  { bulkDeleteTasks, bulkUpdateHierarchies, bulkUpdatePredecessors, queryClient, projectId, userId }: {
    bulkDeleteTasks: UseTaskDeleteParams['bulkDeleteTasks'];
    bulkUpdateHierarchies: UseTaskDeleteParams['bulkUpdateHierarchies'];
    bulkUpdatePredecessors: UseTaskDeleteParams['bulkUpdatePredecessors'];
    queryClient: QueryClient;
    projectId: string;
    userId: string | undefined;
  }
) {
  // Phase 1: Delete all tasks
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
      originalTasks: tasks,
      options: { suppressInvalidate: true },
      ordered: true
    });
    
    queryClient.setQueryData(['project-tasks', projectId, userId], (oldData: ProjectTask[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(task => {
        const update = deleteResult.hierarchyUpdates.find(u => u.id === task.id);
        return update ? { ...task, hierarchy_number: update.hierarchy_number } : task;
      });
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
}

export function useTaskDelete({
  projectId,
  tasks,
  selectedTasks,
  setSelectedTasks,
  hasChildren,
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

  const pipelineContext = {
    bulkDeleteTasks,
    bulkUpdateHierarchies,
    bulkUpdatePredecessors,
    queryClient,
    projectId,
    userId: user?.id,
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (hasChildren(taskId)) {
      toast({ title: "Error", description: "Cannot delete parent task - delete all child tasks first", variant: "destructive" });
      return;
    }

    const dependentTasks = getTasksWithDependency(task.hierarchy_number!, tasks);
    if (dependentTasks.length > 0) {
      setPendingDelete({ taskId, dependentTasks });
      return;
    }

    captureState(tasks);

    try {
      const deleteResult = computeDeleteUpdates(task, tasks);
      await executeDeletePipeline(deleteResult, tasks, pipelineContext);
      
      if (selectedTasks.has(taskId)) {
        const newSelected = new Set(selectedTasks);
        newSelected.delete(taskId);
        setSelectedTasks(newSelected);
      }
      
      toast({ title: "Success", description: "Task deleted successfully" });
    } catch (error: any) {
      console.error("Failed to delete task:", error);
      toast({ title: "Error", description: `Failed to delete task: ${error?.message || 'Unknown error'}`, variant: "destructive" });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) {
      toast({ title: "Error", description: "No tasks selected", variant: "destructive" });
      return;
    }

    setIsDeletingBulk(true);
    captureState(tasks);

    const selectedTaskIds = Array.from(selectedTasks);
    
    // Check parent/children consistency
    for (const taskId of selectedTaskIds) {
      const task = tasks.find(t => t.id === taskId);
      if (task && hasChildren(taskId)) {
        const children = tasks.filter(t => 
          t.hierarchy_number?.startsWith(task.hierarchy_number + ".") &&
          t.hierarchy_number.split(".").length === task.hierarchy_number.split(".").length + 1
        );
        if (!children.every(child => selectedTasks.has(child.id))) {
          setIsDeletingBulk(false);
          toast({ title: "Error", description: "Cannot delete parent task - select all child tasks first or delete child tasks individually", variant: "destructive" });
          return;
        }
      }
    }

    // Check for external dependencies
    const dependentTasks: ProjectTask[] = [];
    for (const taskId of selectedTaskIds) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const deps = getTasksWithDependency(task.hierarchy_number!, tasks);
        dependentTasks.push(...deps.filter(dep => !selectedTasks.has(dep.id)));
      }
    }

    if (dependentTasks.length > 0) {
      setIsDeletingBulk(false);
      setPendingBulkDelete({ taskIds: selectedTaskIds, dependentTasks });
      return;
    }

    try {
      const deleteResult = computeBulkDeleteUpdates(selectedTaskIds, tasks);
      await executeDeletePipeline(deleteResult, tasks, pipelineContext);
      setSelectedTasks(new Set());
      toast({ title: "Success", description: `${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} deleted successfully` });
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast({ title: "Error", description: "Failed to delete selected tasks", variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      const taskToDelete = tasks.find(t => t.id === pendingDelete.taskId);
      if (!taskToDelete) return;

      const deleteResult = computeDeleteUpdates(taskToDelete, tasks);
      await executeDeletePipeline(deleteResult, tasks, pipelineContext);
      
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
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!pendingBulkDelete) return;

    setIsDeletingBulk(true);
    
    try {
      const selectedTaskIds = pendingBulkDelete.taskIds;
      
      // Remove predecessor references from dependent tasks first
      const predecessorClearUpdates = pendingBulkDelete.dependentTasks.map(depTask => {
        const currentPreds = Array.isArray(depTask.predecessor) 
          ? depTask.predecessor 
          : (depTask.predecessor ? [depTask.predecessor] : []);
        
        const deletingHierarchies = selectedTaskIds
          .map(id => tasks.find(t => t.id === id)?.hierarchy_number)
          .filter(Boolean);
        
        const newPreds = currentPreds.filter((pred: string) => {
          const predBase = pred.replace(/\s*(SS|SF|FF|FS)?(\s*[+-]\d+d?)?$/i, '').trim();
          return !deletingHierarchies.includes(predBase);
        });
        
        return { id: depTask.id, predecessor: newPreds };
      });
      
      if (predecessorClearUpdates.length > 0) {
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorClearUpdates, 
          options: { suppressInvalidate: true, skipValidation: true } 
        });
      }
      
      const deleteResult = computeBulkDeleteUpdates(selectedTaskIds, tasks);
      await executeDeletePipeline(deleteResult, tasks, pipelineContext);
      
      setSelectedTasks(new Set());
      setPendingBulkDelete(null);
      toast({ title: "Success", description: `${selectedTaskIds.length} task(s) deleted successfully` });
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast({ title: "Error", description: `Failed to delete tasks: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    }
  };

  return {
    pendingDelete,
    pendingBulkDelete,
    isDeletingBulk,
    handleDeleteTask,
    handleBulkDelete,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    clearPendingDelete: () => setPendingDelete(null),
    clearPendingBulkDelete: () => setPendingBulkDelete(null),
  };
}
