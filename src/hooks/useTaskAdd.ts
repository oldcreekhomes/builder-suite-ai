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

  // Handle adding a task above another task with optimistic UI
  const handleAddAbove = async (relativeTaskId: string) => {
    try {
      const targetTask = tasks.find(t => t.id === relativeTaskId);
      if (!targetTask || !targetTask.hierarchy_number) {
        toast({ title: "Error", description: "Invalid task selected", variant: "destructive" });
        return;
      }

      // Capture state for undo
      captureState(tasks);

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
        confirmed: null,
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
      // Clear batch operation flag and set cooldown
      (window as any).__batchOperationInProgress = false;
      // Set 3-second cooldown to prevent realtime interference
      (window as any).__batchOperationCooldownUntil = Date.now() + 3000;
    }
  };

  // Handle adding a task below another task with optimistic UI
  const handleAddBelow = async (relativeTaskId: string) => {
    try {
      const targetTask = tasks.find(t => t.id === relativeTaskId);
      if (!targetTask || !targetTask.hierarchy_number) {
        toast({ title: "Error", description: "Invalid task selected", variant: "destructive" });
        return;
      }

      // Capture state for undo
      captureState(tasks);

      // Import the add below logic
      const { calculateAddBelowUpdates } = await import('@/utils/addBelowLogic');
      
      // Calculate all updates needed
      const { newTaskHierarchy, hierarchyUpdates, predecessorUpdates } = 
        calculateAddBelowUpdates(targetTask, tasks);
      
      console.log("🔄 Calculated add below updates:", {
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
        
        // Insert the optimistic task AFTER the target task
        const targetIndex = updatedTasks.findIndex(t => t.id === targetTask.id);
        if (targetIndex >= 0) {
          updatedTasks.splice(targetIndex + 1, 0, optimisticTask as ProjectTask);
        } else {
          updatedTasks.push(optimisticTask as ProjectTask);
        }
        
        return updatedTasks;
      });

      // Use bulk mutations instead of RPC to properly handle hierarchy updates
      console.log("🔄 Starting add below operation with bulk mutations...");
      
      const startString = formatYMD(startDate) + 'T00:00:00+00:00';
      const endString = formatYMD(endDate) + 'T00:00:00+00:00';
      
      // Step 1: Apply hierarchy updates to shift existing tasks using ORIGINAL data
      if (hierarchyUpdates.length > 0) {
        console.log("📊 Applying hierarchy updates:", hierarchyUpdates.length);
        // Use original tasks to avoid cache collision and force ordered execution
        await bulkUpdateHierarchies.mutateAsync({
          updates: hierarchyUpdates,
          originalTasks,
          ordered: true, // Force ordered execution for add below operations
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

      console.log("✅ Add below operation completed, new task ID:", createdTask.id);

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
        confirmed: null,
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

      console.log("✅ Add Below operation completed successfully");
      toast({ title: "Success", description: "Task added below successfully" });
    } catch (error) {
      console.error("❌ Add Below operation failed:", error);
      
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: `Failed to add task below: ${errorMessage}`, variant: "destructive" });
    } finally {
      // Clear batch operation flag and set cooldown
      (window as any).__batchOperationInProgress = false;
      // Set 3-second cooldown to prevent realtime interference
      (window as any).__batchOperationCooldownUntil = Date.now() + 3000;
    }
  };

  return {
    handleAddTask,
    handleAddAbove,
    handleAddBelow,
  };
}
