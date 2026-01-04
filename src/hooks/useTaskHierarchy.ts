import { useCallback } from "react";
import { QueryClient } from "@tanstack/react-query";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";
import { addPendingUpdate } from "@/hooks/useProjectTasks";
import { calculateParentTaskValues, shouldUpdateParentTask } from "@/utils/taskCalculations";
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
  recalculateParentHierarchy: (hierarchyNumber: string) => void;
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
  
  // Comprehensive function to recalculate all parent tasks in a hierarchy
  const recalculateParentHierarchy = useCallback((hierarchyNumber: string) => {
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
  }, [projectId, user, queryClient, updateTask]);

  const handleIndent = useCallback(async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    // Capture state for undo
    captureState(tasks);
    
    // Import the new function
    const { generateIndentUpdates } = await import("@/utils/hierarchyUtils");
    const updates = generateIndentUpdates(task, tasks);
    
    if (updates.length === 0) {
      toast({ title: "Error", description: "Cannot indent this task", variant: "destructive" });
      return;
    }
    
    try {
      // Add affected task ids to pending set to ignore realtime echoes
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
  }, [tasks, user, projectId, captureState, bulkUpdateHierarchies, queryClient, setExpandAllTasks, toast]);

  const handleOutdent = useCallback(async (taskId: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task || !tasks || !user) return;
    
    // Capture state for undo
    captureState(tasks);
    
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
  }, [tasks, user, projectId, captureState, bulkUpdateHierarchies, bulkUpdatePredecessors, queryClient, setExpandAllTasks, toast]);

  return {
    handleIndent,
    handleOutdent,
    recalculateParentHierarchy,
  };
}
