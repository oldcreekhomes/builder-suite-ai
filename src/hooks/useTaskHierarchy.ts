import { useCallback } from "react";
import { QueryClient } from "@tanstack/react-query";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";
import { User } from "@supabase/supabase-js";

interface ToastProps {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface UseTaskHierarchyParams {
  projectId: string;
  tasks: ProjectTask[];
  setExpandAllTasks: (value: boolean) => void;
  captureState: (tasks: ProjectTask[]) => void;
  updateTask: ReturnType<typeof useTaskMutations>["updateTask"];
  bulkUpdateHierarchies: ReturnType<typeof useTaskBulkMutations>["bulkUpdateHierarchies"];
  bulkUpdatePredecessors: ReturnType<typeof useTaskBulkMutations>["bulkUpdatePredecessors"];
  queryClient: QueryClient;
  user: User | null;
  toast: (props: ToastProps) => void;
}

interface UseTaskHierarchyReturn {
  handleIndent: (taskId: string) => Promise<void>;
  handleOutdent: (taskId: string) => Promise<void>;
}

export function useTaskHierarchy({
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
}: UseTaskHierarchyParams): UseTaskHierarchyReturn {

  const handleIndent = useCallback(async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    captureState(tasks);
    
    const { generateIndentUpdates } = await import("@/utils/hierarchyUtils");
    const updates = generateIndentUpdates(task, tasks);
    
    if (updates.length === 0) {
      toast({ title: "Error", description: "Cannot indent this task", variant: "destructive" });
      return;
    }
    
    try {
      // Apply optimistic update
      const currentTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
      const optimisticTasks = currentTasks.map(t => {
        const update = updates.find(u => u.id === t.id);
        return update ? { ...t, hierarchy_number: update.hierarchy_number } : t;
      });
      
      queryClient.setQueryData(['project-tasks', projectId, user.id], optimisticTasks);
      
      await bulkUpdateHierarchies.mutateAsync({
        updates: updates.map(u => ({ id: u.id, hierarchy_number: u.hierarchy_number })),
        options: { suppressInvalidate: true }
      });
      
      setExpandAllTasks(true);
      toast({ title: "Success", description: "Task indented successfully" });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      toast({ title: "Error", description: "Failed to indent task", variant: "destructive" });
      console.error("Error indenting task:", error);
    }
  }, [tasks, user, projectId, captureState, bulkUpdateHierarchies, queryClient, setExpandAllTasks, toast]);

  const handleOutdent = useCallback(async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    captureState(tasks);
    
    const { computeOutdentUpdates } = await import("@/utils/outdentLogic");
    const originalTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
    const result = computeOutdentUpdates(task, originalTasks);
    
    if (result.hierarchyUpdates.length === 0) {
      toast({ title: "Error", description: "Cannot outdent this task", variant: "destructive" });
      return;
    }
    
    try {
      // Apply optimistic update
      const optimisticTasks = originalTasks.map(t => {
        const hierarchyUpdate = result.hierarchyUpdates.find(u => u.id === t.id);
        return hierarchyUpdate ? { ...t, hierarchy_number: hierarchyUpdate.hierarchy_number } : t;
      });
      
      queryClient.setQueryData(['project-tasks', projectId, user.id], optimisticTasks);
      
      await bulkUpdateHierarchies.mutateAsync({
        updates: result.hierarchyUpdates,
        originalTasks,
        options: { suppressInvalidate: true }
      });
      
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
      
      setExpandAllTasks(true);
      toast({ title: "Success", description: "Task outdented successfully" });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      toast({ title: "Error", description: "Failed to outdent task", variant: "destructive" });
      console.error("Error outdenting task:", error);
    }
  }, [tasks, user, projectId, captureState, bulkUpdateHierarchies, bulkUpdatePredecessors, queryClient, setExpandAllTasks, toast]);

  return {
    handleIndent,
    handleOutdent,
  };
}
