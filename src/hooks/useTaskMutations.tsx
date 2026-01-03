import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask, addPendingUpdate } from "./useProjectTasks";
import { recalculateAllTaskDates } from "@/utils/scheduleRecalculation";
import { useCallback } from "react";

interface CreateTaskParams {
  project_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration?: number;
  progress?: number;
  predecessor?: string[] | string;
  resources?: string;
  hierarchy_number?: string;
}

interface UpdateTaskParams {
  id: string;
  task_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  progress?: number;
  predecessor?: string[] | string;
  resources?: string;
  hierarchy_number?: string;
  notes?: string;
  suppressInvalidate?: boolean;
  skipCascade?: boolean;
}

export const useTaskMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimized parent recalculation - calculates ALL parents in memory, then single batch write
  const recalculateParentDates = useCallback(async (hierarchyNumber: string) => {
    if (!hierarchyNumber || !hierarchyNumber.includes('.')) return; // Top-level task has no parent
    
    let freshTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
    if (freshTasks.length === 0) return;
    
    // Make a mutable copy for in-memory calculations
    freshTasks = [...freshTasks.map(t => ({ ...t }))];
    
    // 1. CALCULATE ALL parent updates in memory (no DB calls yet)
    const parentUpdates: Array<{ id: string; start_date: string; end_date: string; duration: number; progress: number }> = [];
    let currentHierarchy = hierarchyNumber;
    
    while (currentHierarchy.includes('.')) {
      const parentHierarchy = currentHierarchy.split('.').slice(0, -1).join('.');
      const parentTask = freshTasks.find(t => t.hierarchy_number === parentHierarchy);
      
      if (!parentTask) break;
      
      // Get all descendants
      const children = freshTasks.filter(t => 
        t.hierarchy_number?.startsWith(parentHierarchy + '.') &&
        t.hierarchy_number !== parentHierarchy
      );
      
      if (children.length === 0) break;
      
      const validChildren = children.filter(t => t.start_date && t.end_date);
      if (validChildren.length === 0) break;
      
      // Calculate MIN/MAX in memory
      const earliestStart = validChildren.reduce((min, t) => {
        const date = t.start_date.split('T')[0];
        return date < min ? date : min;
      }, validChildren[0].start_date.split('T')[0]);
      
      const latestEnd = validChildren.reduce((max, t) => {
        const date = t.end_date.split('T')[0];
        return date > max ? date : max;
      }, validChildren[0].end_date.split('T')[0]);
      
      const totalProgress = validChildren.reduce((sum, t) => sum + (t.progress || 0), 0);
      const avgProgress = Math.round(totalProgress / validChildren.length);
      
      const startMs = new Date(earliestStart).getTime();
      const endMs = new Date(latestEnd).getTime();
      const durationDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      
      const currentStartDate = parentTask.start_date.split('T')[0];
      const currentEndDate = parentTask.end_date.split('T')[0];
      
      // Only include if different
      if (currentStartDate !== earliestStart || currentEndDate !== latestEnd || parentTask.progress !== avgProgress) {
        parentUpdates.push({
          id: parentTask.id,
          start_date: earliestStart + 'T00:00:00',
          end_date: latestEnd + 'T00:00:00',
          duration: durationDays,
          progress: avgProgress
        });
        
        // Update freshTasks array for next iteration (so grandparent calc uses new parent values)
        const parentIndex = freshTasks.findIndex(t => t.id === parentTask.id);
        if (parentIndex !== -1) {
          freshTasks[parentIndex] = {
            ...freshTasks[parentIndex],
            start_date: earliestStart + 'T00:00:00',
            end_date: latestEnd + 'T00:00:00',
            duration: durationDays,
            progress: avgProgress
          };
        }
      }
      
      currentHierarchy = parentHierarchy;
    }
    
    if (parentUpdates.length === 0) return;
    
    // 2. OPTIMISTIC UI UPDATE - instant feedback
    const currentCache = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
    const optimisticTasks = currentCache.map(task => {
      const update = parentUpdates.find(u => u.id === task.id);
      return update ? { ...task, ...update } : task;
    });
    queryClient.setQueryData(['project-tasks', projectId, user?.id], optimisticTasks);
    
    console.log(`📊 Optimistically updated ${parentUpdates.length} parent(s)`);
    
    // 3. BATCH DATABASE WRITE - all updates in parallel
    const updatePromises = parentUpdates.map(u => 
      supabase
        .from('project_schedule_tasks')
        .update({ start_date: u.start_date, end_date: u.end_date, duration: u.duration, progress: u.progress })
        .eq('id', u.id)
    );
    
    const results = await Promise.all(updatePromises);
    const hasError = results.some(r => r.error);
    
    if (hasError) {
      console.error('Parent update errors:', results.filter(r => r.error).map(r => r.error));
      // Invalidate to refetch correct data on error
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    } else {
      console.log(`✅ Batch updated ${parentUpdates.length} parent(s) in parallel`);
    }
  }, [queryClient, projectId, user?.id]);

  const createTask = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      // Note: We removed the pre-check for duplicate hierarchy numbers here
      // because the bulk hierarchy updates should have cleared the way
      // The database constraint will catch any real duplicates as a failsafe

      // Normalize dates to include T00:00:00 format
      const normalizeDate = (date: string) => {
        if (!date) return date;
        // Remove any UTC suffix and ensure T00:00:00 format
        return date.split('T')[0] + 'T00:00:00';
      };

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .insert({
          project_id: params.project_id,
          task_name: params.task_name,
          start_date: normalizeDate(params.start_date),
          end_date: normalizeDate(params.end_date),
          duration: params.duration || 1,
          progress: params.progress || 0,
          predecessor: Array.isArray(params.predecessor) ? params.predecessor : (params.predecessor ? [params.predecessor] : null),
          resources: params.resources || null,
          hierarchy_number: params.hierarchy_number || "1",
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: 'Task created successfully' });
      
      // Direct parent recalculation (skip if batch operation in progress)
      if (data.hierarchy_number && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task created, direct parent recalculation for:', data.hierarchy_number);
        await recalculateParentDates(data.hierarchy_number);
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({ title: "Error", description: 'Failed to create task', variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async (params: UpdateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      console.log('🔧 UpdateTask mutation called with params:', params);

      // Check for duplicate hierarchy number before updating (if hierarchy_number is being changed)
      if (params.hierarchy_number !== undefined) {
        const { data: currentTask } = await supabase
          .from('project_schedule_tasks')
          .select('project_id, hierarchy_number')
          .eq('id', params.id)
          .single();

        if (currentTask && params.hierarchy_number !== currentTask.hierarchy_number) {
          const { data: existingTask } = await supabase
            .from('project_schedule_tasks')
            .select('id')
            .eq('project_id', currentTask.project_id)
            .eq('hierarchy_number', params.hierarchy_number)
            .neq('id', params.id)
            .maybeSingle();

          if (existingTask) {
            throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
          }
        }
      }

      // Normalize dates to include T00:00:00 format
      const normalizeDate = (date: string) => {
        if (!date) return date;
        // Remove any UTC suffix and ensure T00:00:00 format
        return date.split('T')[0] + 'T00:00:00';
      };

      // Build update data - validation already done on client side
      const updateData: any = {};
      if (params.task_name !== undefined) updateData.task_name = params.task_name;
      if (params.start_date !== undefined) updateData.start_date = normalizeDate(params.start_date);
      if (params.end_date !== undefined) updateData.end_date = normalizeDate(params.end_date);
      if (params.duration !== undefined) updateData.duration = params.duration;
      if (params.progress !== undefined) updateData.progress = params.progress;
      if (params.predecessor !== undefined) {
        updateData.predecessor = Array.isArray(params.predecessor) ? params.predecessor : (params.predecessor ? [params.predecessor] : null);
      }
      if (params.resources !== undefined) updateData.resources = params.resources;
      if (params.hierarchy_number !== undefined) updateData.hierarchy_number = params.hierarchy_number;
      if (params.notes !== undefined) updateData.notes = params.notes;

      console.log('🔧 Update data being sent to database:', updateData);

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        console.error('🔧 Database update error:', error);
        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
        }
        throw error;
      }

      console.log('🔧 Database update successful:', data);
      return data;
    },
    onSuccess: async (data, variables) => {
      console.log('🔧 Task update success with data:', data);
      
      // Add task to pending updates to ignore realtime echoes
      addPendingUpdate(data.id);
      
      // ✅ CRITICAL FIX: IMMEDIATELY update cache with new task data
      // This ensures recalculateParentDates reads correct child data
      const currentCache = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
      const newPredecessor = data.predecessor as string[] | string | null;
      const updatedCache = currentCache.map(task => 
        task.id === data.id 
          ? { 
              ...task, 
              ...data,
              predecessor: newPredecessor
            } 
          : task
      );
      queryClient.setQueryData(['project-tasks', projectId, user?.id], updatedCache);
      console.log('📦 Cache immediately updated with new task data');
      
      // Check if we need to recalculate dependent tasks
      const dateFieldsChanged = variables.start_date || variables.end_date || variables.duration !== undefined;
      const predecessorChanged = variables.predecessor !== undefined;
      const shouldRecalculate = (dateFieldsChanged || predecessorChanged) && !variables.skipCascade;
      
      // Run full schedule recalculation (replaces complex cascade logic)
      if (shouldRecalculate && updatedCache.length > 0 && user?.id) {
        console.log('🔄 Running full schedule recalculation after task update');
        const result = await recalculateAllTaskDates(projectId, updatedCache, user.id);
        console.log(`✅ Recalculation complete: ${result.updatedCount} tasks updated`);
      }
      
      // Direct parent recalculation on any field change (dates, duration, or progress)
      // Must run BEFORE invalidateQueries to prevent race condition
      const anyFieldsChanged = dateFieldsChanged || variables.progress !== undefined;
      if (data.hierarchy_number && anyFieldsChanged && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task updated, direct parent recalculation for:', data.hierarchy_number);
        await recalculateParentDates(data.hierarchy_number);
      }
      
      // Invalidate AFTER ALL operations complete to sync with server
      // Only needed when date fields changed (cascade/parent calc may have updated other tasks)
      if (!variables.suppressInvalidate && (dateFieldsChanged || predecessorChanged)) {
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('🔧 Task update error:', error);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      toast({ title: "Success", description: 'Task deleted successfully' });
      
      // Direct parent recalculation (skip if batch operation in progress)
      if (data.hierarchy_number && !(window as any).__batchOperationInProgress) {
        console.log('🔄 Task deleted, direct parent recalculation for:', data.hierarchy_number);
        await recalculateParentDates(data.hierarchy_number);
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
      }
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: 'Task deleted successfully', variant: "destructive" });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
};