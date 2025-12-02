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
    
    try {
      // Get current tasks to compare
      const { data: currentTasks } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId);
      
      if (!currentTasks) throw new Error('Failed to fetch current tasks');
      
      // Build maps for comparison
      const previousMap = new Map(previousState.tasks.map(t => [t.id, t]));
      const currentMap = new Map(currentTasks.map(t => [t.id, t]));
      
      // Find tasks that need updating (exist in both, but different)
      const updates: any[] = [];
      for (const prevTask of previousState.tasks) {
        if (currentMap.has(prevTask.id)) {
          updates.push({
            id: prevTask.id,
            task_name: prevTask.task_name,
            start_date: prevTask.start_date,
            end_date: prevTask.end_date,
            duration: prevTask.duration,
            progress: prevTask.progress,
            predecessor: prevTask.predecessor,
            resources: prevTask.resources,
            hierarchy_number: prevTask.hierarchy_number,
            notes: prevTask.notes,
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // Find tasks to delete (exist in current, not in previous)
      const deletes: string[] = [];
      for (const currentTask of currentTasks) {
        if (!previousMap.has(currentTask.id)) {
          deletes.push(currentTask.id);
        }
      }
      
      // Find tasks to insert (exist in previous, not in current)
      const inserts: any[] = [];
      for (const prevTask of previousState.tasks) {
        if (!currentMap.has(prevTask.id)) {
          inserts.push({
            id: prevTask.id,
            project_id: projectId,
            task_name: prevTask.task_name,
            start_date: prevTask.start_date,
            end_date: prevTask.end_date,
            duration: prevTask.duration,
            progress: prevTask.progress,
            predecessor: prevTask.predecessor,
            resources: prevTask.resources,
            hierarchy_number: prevTask.hierarchy_number,
            notes: prevTask.notes
          });
        }
      }
      
      // Execute updates in order
      if (deletes.length > 0) {
        await supabase
          .from('project_schedule_tasks')
          .delete()
          .in('id', deletes);
      }
      
      if (inserts.length > 0) {
        await supabase
          .from('project_schedule_tasks')
          .insert(inserts);
      }
      
      if (updates.length > 0) {
        for (const update of updates) {
          await supabase
            .from('project_schedule_tasks')
            .update(update)
            .eq('id', update.id);
        }
      }
      
      // Remove the undone state from stack
      setUndoStack(prev => prev.slice(0, -1));
      
      // Invalidate cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, userId] });
      
      toast({ title: "Undone", description: "Last change reverted" });
      
    } catch (error) {
      console.error('Undo failed:', error);
      toast({ title: "Error", description: "Failed to undo", variant: "destructive" });
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
