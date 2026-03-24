import { QueryClient } from "@tanstack/react-query";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskBulkMutations } from "@/hooks/useTaskBulkMutations";
import { User } from "@supabase/supabase-js";
import { DateString, today, ensureBusinessDay, calculateBusinessEndDate, formatYMD } from "@/utils/dateOnly";

interface UseTaskAddParams {
  projectId: string;
  tasks: ProjectTask[];
  captureState: (tasks: ProjectTask[]) => void;
  createTask: ReturnType<typeof useTaskMutations>['createTask'];
  bulkUpdateHierarchies: ReturnType<typeof useTaskBulkMutations>['bulkUpdateHierarchies'];
  bulkUpdatePredecessors: ReturnType<typeof useTaskBulkMutations>['bulkUpdatePredecessors'];
  queryClient: QueryClient;
  user: User | null;
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

// Helper: Calculate next top-level hierarchy number
const getNextTopLevelNumber = (tasks: ProjectTask[]): string => {
  const topLevelNumbers = tasks
    .map(t => t.hierarchy_number?.split('.')[0])
    .filter(n => n)
    .map(n => parseInt(n) || 0);
  
  return topLevelNumbers.length > 0 
    ? (Math.max(...topLevelNumbers) + 1).toString()
    : "1";
};

export function useTaskAdd({
  projectId,
  tasks,
  captureState,
  createTask,
  bulkUpdateHierarchies,
  bulkUpdatePredecessors,
  queryClient,
  user,
  toast,
}: UseTaskAddParams) {

  // Add new parent group when Add button is clicked
  const handleAddTask = async () => {
    try {
      const newHierarchyNumber = getNextTopLevelNumber(tasks);
      const startDate = ensureBusinessDay(today());
      const endDate = calculateBusinessEndDate(startDate, 1);
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

  /**
   * Unified add task handler for both "above" and "below" positions.
   * The only difference is which util function calculates the hierarchy updates.
   */
  const handleAddRelative = async (relativeTaskId: string, position: 'above' | 'below') => {
    try {
      const targetTask = tasks.find(t => t.id === relativeTaskId);
      if (!targetTask || !targetTask.hierarchy_number) {
        toast({ title: "Error", description: "Invalid task selected", variant: "destructive" });
        return;
      }

      captureState(tasks);

      // Dynamic import based on position
      const { newTaskHierarchy, hierarchyUpdates, predecessorUpdates } = position === 'above'
        ? (await import('@/utils/addAboveLogic')).calculateAddAboveUpdates(targetTask, tasks)
        : (await import('@/utils/addBelowLogic')).calculateAddBelowUpdates(targetTask, tasks);
      
      console.log(`🔄 Add ${position} updates:`, { hierarchyUpdates: hierarchyUpdates.length, predecessorUpdates: predecessorUpdates.length });

      // Capture original tasks BEFORE any optimistic updates
      const originalTasks = queryClient.getQueryData(['project-tasks', projectId, user?.id]) as ProjectTask[] || [];

      // Create optimistic task
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

      // Apply optimistic update to cache
      queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [optimisticTask];
        
        const updatedTasks = oldData.map(task => {
          const hierarchyUpdate = hierarchyUpdates.find(u => u.id === task.id);
          const predecessorUpdate = predecessorUpdates.find(u => u.taskId === task.id);
          return {
            ...task,
            ...(hierarchyUpdate && { hierarchy_number: hierarchyUpdate.hierarchy_number }),
            ...(predecessorUpdate && { predecessor: predecessorUpdate.newPredecessors })
          } as ProjectTask;
        });
        
        // Insert optimistic task at correct position
        const insertOffset = position === 'above' ? 0 : 1;
        const targetIndex = updatedTasks.findIndex(t => t.id === targetTask.id);
        if (targetIndex >= 0) {
          updatedTasks.splice(targetIndex + insertOffset, 0, optimisticTask as ProjectTask);
        } else {
          updatedTasks.push(optimisticTask as ProjectTask);
        }
        
        return updatedTasks;
      });

      const startString = formatYMD(startDate) + 'T00:00:00+00:00';
      const endString = formatYMD(endDate) + 'T00:00:00+00:00';
      
      // Step 1: Apply hierarchy updates
      if (hierarchyUpdates.length > 0) {
        await bulkUpdateHierarchies.mutateAsync({
          updates: hierarchyUpdates,
          originalTasks,
          ordered: true,
          options: { suppressInvalidate: true }
        });
      }
      
      // Step 2: Apply predecessor updates
      if (predecessorUpdates.length > 0) {
        const predecessorBulkUpdates = predecessorUpdates.map(update => ({
          id: update.taskId,
          predecessor: update.newPredecessors
        }));
        await bulkUpdatePredecessors.mutateAsync({ 
          updates: predecessorBulkUpdates, 
          options: { suppressInvalidate: true } 
        });
      }
      
      // Step 3: Create the new task
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

      // Replace optimistic task with real task
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
        confirmed: null,
        notes: createdTask.notes || undefined
      };

      queryClient.setQueryData(['project-tasks', projectId, user?.id], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [newTask];
        return oldData.map(task => task.id === optimisticTask.id ? newTask : task);
      });

      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: `Task added ${position} successfully` });
    } catch (error) {
      console.error(`❌ Add ${position} operation failed:`, error);
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: `Failed to add task ${position}: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleAddAbove = (relativeTaskId: string) => handleAddRelative(relativeTaskId, 'above');
  const handleAddBelow = (relativeTaskId: string) => handleAddRelative(relativeTaskId, 'below');

  return {
    handleAddTask,
    handleAddAbove,
    handleAddBelow,
  };
}
