import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectTask } from './useProjectTasks';
import { useAuth } from './useAuth';
import { useDebounce } from './useDebounce';

interface PendingCalculation {
  hierarchyNumber: string;
  timestamp: number;
}

interface CalculationBatch {
  hierarchyNumbers: Set<string>;
  projectId: string;
  userId: string;
}

export function useOptimizedTaskCalculations(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingCalculationsRef = useRef<Map<string, PendingCalculation>>(new Map());
  const calculationBatchRef = useRef<CalculationBatch | null>(null);

  // Memoization cache for parent calculations
  const calculationCacheRef = useRef<Map<string, any>>(new Map());

  // Background calculation processing using requestIdleCallback
  const processCalculationsInBackground = useCallback(async (hierarchyNumbers: string[]) => {
    if (!user?.id) return;

    const callback = async () => {
      try {
        console.log('🎯 Processing parent calculations in background:', hierarchyNumbers);
        
        // Get current tasks from cache
        const currentTasks = queryClient.getQueryData<ProjectTask[]>(['project-tasks', projectId, user.id]) || [];
        
        if (currentTasks.length === 0) return;

        const { calculateParentTaskValues, shouldUpdateParentTask } = await import('@/utils/taskCalculations');
        const updates: Array<{ id: string; [key: string]: any }> = [];
        
        // Process each hierarchy number
        for (const hierarchyNumber of hierarchyNumbers) {
          // Check cache first
          const cacheKey = `${hierarchyNumber}-${currentTasks.length}`;
          const cached = calculationCacheRef.current.get(cacheKey);
          
          if (cached && cached.timestamp > Date.now() - 5000) {
            console.log('📋 Using cached calculation for:', hierarchyNumber);
            continue;
          }

          const parentTask = currentTasks.find(t => t.hierarchy_number === hierarchyNumber);
          if (!parentTask) continue;

          const calculations = calculateParentTaskValues(parentTask, currentTasks);
          if (!calculations) continue;

          // Cache the calculation
          calculationCacheRef.current.set(cacheKey, {
            calculations,
            timestamp: Date.now()
          });

          if (shouldUpdateParentTask(parentTask, calculations)) {
            updates.push({
              id: parentTask.id,
              start_date: calculations.startDate,
              end_date: calculations.endDate,
              duration: calculations.duration,
              progress: calculations.progress
            });
          }
        }

        // Apply optimistic updates if any
        if (updates.length > 0) {
          console.log('✨ Applying optimistic parent updates:', updates.length);
          
          const optimisticTasks = currentTasks.map(task => {
            const update = updates.find(u => u.id === task.id);
            return update ? { 
              ...task, 
              start_date: update.start_date + 'T00:00:00',
              end_date: update.end_date + 'T00:00:00',
              duration: update.duration,
              progress: update.progress
            } : task;
          });

          // Set optimistic data immediately
          queryClient.setQueryData(['project-tasks', projectId, user.id], optimisticTasks);

          // Apply database updates in background
          const { supabase } = await import('@/integrations/supabase/client');
          
          const updatePromises = updates.map(async (update) => {
            const { id, ...updateData } = update;
            return supabase
              .from('project_schedule_tasks')
              .update({
                start_date: updateData.start_date + 'T00:00:00',
                end_date: updateData.end_date + 'T00:00:00',
                duration: updateData.duration,
                progress: updateData.progress
              })
              .eq('id', id);
          });

          await Promise.all(updatePromises);
          console.log('✅ Background database updates completed');
        }

      } catch (error) {
        console.error('❌ Background calculation error:', error);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback, { timeout: 1000 });
    } else {
      setTimeout(callback, 0);
    }
  }, [user?.id, queryClient, projectId]);

  // Debounced batch processor
  const processBatch = useDebounce(
    useCallback(async () => {
      const batch = calculationBatchRef.current;
      if (!batch || batch.hierarchyNumbers.size === 0) return;

      const hierarchyNumbers = Array.from(batch.hierarchyNumbers);
      calculationBatchRef.current = null;

      await processCalculationsInBackground(hierarchyNumbers);
    }, [processCalculationsInBackground]),
    1000, // Debounce for 1 second
    { maxWait: 3000 } // Force execution after 3 seconds max
  );

  // Public method to trigger parent recalculation
  const triggerParentRecalculation = useCallback((hierarchyNumber: string) => {
    if (!user?.id) return;

    console.log('🔄 Queueing parent recalculation for:', hierarchyNumber);

    // Add to batch
    if (!calculationBatchRef.current) {
      calculationBatchRef.current = {
        hierarchyNumbers: new Set(),
        projectId,
        userId: user.id
      };
    }

    calculationBatchRef.current.hierarchyNumbers.add(hierarchyNumber);

    // Also add parent hierarchies to ensure proper cascading
    const parts = hierarchyNumber.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentHierarchy = parts.slice(0, i).join('.');
      calculationBatchRef.current.hierarchyNumbers.add(parentHierarchy);
    }

    // Process the batch (debounced)
    processBatch();
  }, [user?.id, projectId, processBatch]);

  // Clear calculation cache when tasks change significantly
  const clearCalculationCache = useCallback(() => {
    calculationCacheRef.current.clear();
    console.log('🧹 Calculation cache cleared');
  }, []);

  return {
    triggerParentRecalculation,
    clearCalculationCache
  };
}