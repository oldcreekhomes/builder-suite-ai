import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask } from "./useProjectTasks";
import { useCallback } from "react";
import { calculateTaskDatesFromPredecessors } from "@/utils/taskCalculations";
import { safeParsePredecessors, parsePredecessorString } from "@/utils/predecessorValidation";
import { normalizeToYMD } from "@/utils/dateOnly";

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
  // Original dates captured BEFORE optimistic update - used for cascade detection
  _originalStartDate?: string;
  _originalEndDate?: string;
}

export const useTaskMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // IMPROVED parent recalculation - uses ALL descendants, not just direct children
  const updateParentDates = useCallback(async (childHierarchy: string) => {
    if (!childHierarchy || !childHierarchy.includes('.')) return;
    
    const tasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
    if (tasks.length === 0) return;
    
    // Walk up the hierarchy and update each parent
    let currentHierarchy = childHierarchy;
    
    while (currentHierarchy.includes('.')) {
      const parentHierarchy = currentHierarchy.split('.').slice(0, -1).join('.');
      const parentTask = tasks.find(t => t.hierarchy_number === parentHierarchy);
      
      if (!parentTask) break;
      
      // Get ALL descendants (not just direct children) for accurate min/max
      const descendants = tasks.filter(t => {
        if (!t.hierarchy_number) return false;
        return t.hierarchy_number.startsWith(parentHierarchy + '.') && 
               t.hierarchy_number !== parentHierarchy;
      });
      
      if (descendants.length === 0) break;
      
      // Calculate MIN start and MAX end from ALL descendants
      const startDate = descendants.reduce((min, t) => {
        const date = t.start_date.split('T')[0];
        return date < min ? date : min;
      }, descendants[0].start_date.split('T')[0]);
      
      const endDate = descendants.reduce((max, t) => {
        const date = t.end_date.split('T')[0];
        return date > max ? date : max;
      }, descendants[0].end_date.split('T')[0]);
      
      // Calculate weighted average progress based on duration
      const totalDuration = descendants.reduce((sum, t) => sum + t.duration, 0);
      const completedDuration = descendants.reduce((sum, t) => {
        const taskProgress = (t.progress || 0) / 100;
        return sum + (t.duration * taskProgress);
      }, 0);
      const avgProgress = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
      
      // Calculate duration
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const duration = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      
      // Check if update needed
      const currentStart = parentTask.start_date.split('T')[0];
      const currentEnd = parentTask.end_date.split('T')[0];
      
      if (currentStart !== startDate || currentEnd !== endDate || parentTask.progress !== avgProgress) {
        console.log(`📊 Updating parent ${parentHierarchy}: ${startDate} to ${endDate} (from ${descendants.length} descendants)`);
        
        // Optimistic update
        const updatedTasks = tasks.map(t => 
          t.id === parentTask.id 
            ? { ...t, start_date: startDate + 'T00:00:00', end_date: endDate + 'T00:00:00', duration, progress: avgProgress }
            : t
        );
        queryClient.setQueryData(['project-tasks', projectId, user?.id], updatedTasks);
        
        // Database update
        await supabase
          .from('project_schedule_tasks')
          .update({ 
            start_date: startDate + 'T00:00:00', 
            end_date: endDate + 'T00:00:00', 
            duration, 
            progress: avgProgress 
          })
          .eq('id', parentTask.id);
      }
      
      currentHierarchy = parentHierarchy;
    }
  }, [queryClient, projectId, user?.id]);

  // CASCADE to dependent tasks when dates change
  const cascadeToDependents = useCallback(async (
    changedTaskHierarchy: string,
    originalStartDate: string,
    originalEndDate: string
  ) => {
    const tasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
    if (tasks.length === 0) return;

    // Find all tasks that depend on this task
    const findDependentTasks = (hierarchy: string): ProjectTask[] => {
      return tasks.filter(t => {
        if (!t.predecessor) return false;
        const preds = safeParsePredecessors(t.predecessor);
        return preds.some(p => {
          const parsed = parsePredecessorString(p);
          return parsed?.taskId === hierarchy;
        });
      });
    };

    // Process dependents recursively but only if they actually violate constraints
    const processedIds = new Set<string>();
    
    const processDependents = async (hierarchy: string) => {
      const dependents = findDependentTasks(hierarchy);
      
      for (const dependent of dependents) {
        if (processedIds.has(dependent.id)) continue;
        processedIds.add(dependent.id);
        
        // Get fresh task data from cache
        const freshTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
        const freshDependent = freshTasks.find(t => t.id === dependent.id);
        if (!freshDependent) continue;

        // Calculate what the dates SHOULD be based on predecessor
        const calculatedDates = calculateTaskDatesFromPredecessors(freshDependent, freshTasks);
        
        if (!calculatedDates) continue;
        
        const currentStart = normalizeToYMD(freshDependent.start_date);
        const requiredStart = calculatedDates.startDate;
        
        // ONLY fix violations - if current start is BEFORE required, push it
        if (currentStart < requiredStart) {
          console.log(`🔗 Cascading to ${freshDependent.hierarchy_number}: ${currentStart} → ${requiredStart} (violation fix)`);
          
          const newStartDate = calculatedDates.startDate + 'T00:00:00';
          const newEndDate = calculatedDates.endDate + 'T00:00:00';
          
          // Optimistic update
          const updatedTasks = freshTasks.map(t => 
            t.id === freshDependent.id 
              ? { ...t, start_date: newStartDate, end_date: newEndDate, duration: calculatedDates.duration }
              : t
          );
          queryClient.setQueryData(['project-tasks', projectId, user?.id], updatedTasks);
          
          // Database update
          await supabase
            .from('project_schedule_tasks')
            .update({ 
              start_date: newStartDate, 
              end_date: newEndDate, 
              duration: calculatedDates.duration 
            })
            .eq('id', freshDependent.id);
          
          // Update parent of this dependent if it's a child task
          if (freshDependent.hierarchy_number?.includes('.')) {
            await updateParentDates(freshDependent.hierarchy_number);
          }
          
          // Recursively cascade to this task's dependents
          if (freshDependent.hierarchy_number) {
            await processDependents(freshDependent.hierarchy_number);
          }
        }
      }
    };

    await processDependents(changedTaskHierarchy);
  }, [queryClient, projectId, user?.id, updateParentDates]);

  const createTask = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      if (!user) throw new Error('User not authenticated');

      const normalizeDate = (date: string) => {
        if (!date) return date;
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
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: async (data) => {
      toast({ title: "Success", description: 'Task created successfully' });
      
      // Update parent if this is a child task
      if (data.hierarchy_number?.includes('.')) {
        await updateParentDates(data.hierarchy_number);
      }
      
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
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

      // Use passed-in original dates (captured BEFORE optimistic update) for cascade comparison
      // This is critical because the cache has already been updated optimistically
      const originalStartDate = params._originalStartDate;
      const originalEndDate = params._originalEndDate;

      // Check for duplicate hierarchy number before updating
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

      const normalizeDate = (date: string) => {
        if (!date) return date;
        return date.split('T')[0] + 'T00:00:00';
      };

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
        if (error.code === '23505' && error.message.includes('unique_hierarchy_per_project')) {
          throw new Error(`Hierarchy number "${params.hierarchy_number}" already exists in this project`);
        }
        throw error;
      }

      console.log('🔧 Database update successful:', data);
      return { data, originalStartDate, originalEndDate, skipCascade: params.skipCascade };
    },
    onSuccess: async (result, variables) => {
      const { data, originalStartDate, originalEndDate, skipCascade } = result;
      console.log('🔧 Task update success');
      
      // Immediately update cache
      const currentCache = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user?.id]) || [];
      const updatedCache = currentCache.map(task => 
        task.id === data.id ? { ...task, ...data } : task
      );
      queryClient.setQueryData(['project-tasks', projectId, user?.id], updatedCache);
      
      // Update parent dates if this is a child task
      if (data.hierarchy_number?.includes('.')) {
        await updateParentDates(data.hierarchy_number);
      }
      
      // Cascade to dependents if dates changed and not skipped
      // Use original dates passed from caller (captured BEFORE optimistic update)
      if (!skipCascade && originalStartDate && originalEndDate && data.hierarchy_number) {
        const originalStart = normalizeToYMD(originalStartDate);
        const originalEnd = normalizeToYMD(originalEndDate);
        const newStart = normalizeToYMD(data.start_date);
        const newEnd = normalizeToYMD(data.end_date);
        
        if (originalStart !== newStart || originalEnd !== newEnd) {
          console.log(`🔗 Dates changed for ${data.hierarchy_number}: ${originalStart}→${newStart}, cascading to dependents...`);
          await cascadeToDependents(data.hierarchy_number, originalStart, originalEnd);
        }
      }
      
      // Invalidate to sync with server
      if (!variables.suppressInvalidate) {
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
      toast({ title: "Success", description: 'Task deleted successfully' });
      
      // Update parent dates if deleted task was a child
      if (data.hierarchy_number?.includes('.')) {
        await updateParentDates(data.hierarchy_number);
      }
      
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user?.id] });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: 'Failed to delete task', variant: "destructive" });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
};