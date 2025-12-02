import { useState, useCallback, useEffect } from "react";
import { ProjectTask } from "./useProjectTasks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface UndoState {
  tasks: ProjectTask[];
  timestamp: number;
}

const MAX_UNDO_HISTORY = 20;

export function useScheduleUndo(projectId: string, userId: string | undefined) {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Capture current state before making changes
  const captureState = useCallback((currentTasks: ProjectTask[]) => {
    if (isUndoing || !currentTasks || currentTasks.length === 0) return;
    
    setUndoStack(prev => {
      const newStack = [...prev, { 
        tasks: JSON.parse(JSON.stringify(currentTasks)), // Deep clone
        timestamp: Date.now()
      }];
      // Keep only last MAX_UNDO_HISTORY items
      return newStack.slice(-MAX_UNDO_HISTORY);
    });
  }, [isUndoing]);

  // Undo the last change
  const undo = useCallback(async () => {
    if (undoStack.length === 0 || !userId) return;
    
    setIsUndoing(true);
    const previousState = undoStack[undoStack.length - 1];
    
    // STEP 1: INSTANT UI UPDATE (optimistic)
    // Update cache immediately so user sees change right away
    queryClient.setQueryData(
      ['project-tasks', projectId, userId],
      previousState.tasks
    );
    
    // Remove from undo stack immediately
    setUndoStack(prev => prev.slice(0, -1));
    
    toast({ title: "Undone", description: "Last change reverted" });
    
    // STEP 2: BACKGROUND DATABASE SYNC
    try {
      // Get current tasks to find what needs deleting
      const { data: currentTasks } = await supabase
        .from('project_schedule_tasks')
        .select('id')
        .eq('project_id', projectId);
      
      const previousIds = new Set(previousState.tasks.map(t => t.id));
      const currentIds = new Set(currentTasks?.map(t => t.id) || []);
      
      // Find tasks to delete (in current but not in previous)
      const toDelete = [...currentIds].filter(id => !previousIds.has(id));
      
      // Batch operations in parallel
      const operations = [];
      
      // Delete new tasks that shouldn't exist
      if (toDelete.length > 0) {
        operations.push(
          supabase
            .from('project_schedule_tasks')
            .delete()
            .in('id', toDelete)
        );
      }
      
      // Upsert all previous tasks (handles both inserts and updates in ONE call)
      if (previousState.tasks.length > 0) {
        const tasksToUpsert = previousState.tasks.map(t => ({
          id: t.id,
          project_id: projectId,
          task_name: t.task_name,
          start_date: t.start_date,
          end_date: t.end_date,
          duration: t.duration,
          progress: t.progress,
          predecessor: t.predecessor,
          resources: t.resources,
          hierarchy_number: t.hierarchy_number,
          notes: t.notes,
          updated_at: new Date().toISOString()
        }));
        
        operations.push(
          supabase
            .from('project_schedule_tasks')
            .upsert(tasksToUpsert, { onConflict: 'id' })
        );
      }
      
      // Execute all operations in parallel
      await Promise.all(operations);
      
    } catch (error) {
      console.error('Undo sync failed:', error);
      // Refetch to ensure consistency if background sync fails
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, userId] });
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, projectId, userId, queryClient, toast]);

  const canUndo = undoStack.length > 0 && !isUndoing;
  
  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undo]);

  return { captureState, undo, canUndo, isUndoing };
}
