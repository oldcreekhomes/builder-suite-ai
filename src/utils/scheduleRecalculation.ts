/**
 * Schedule Recalculation Utility
 * 
 * Recalculates all task dates in a project based on predecessors.
 * Processes tasks in topological order (predecessors before dependents).
 */

import { ProjectTask } from "@/hooks/useProjectTasks";
import { calculateTaskDatesFromPredecessors, calculateParentTaskValues } from "./taskCalculations";
import { createClient } from '@supabase/supabase-js';

// Create a simpler client without deep type inference to avoid TS2589
const SUPABASE_URL = "https://nlmnwlvmmkngrgatnzkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbW53bHZtbWtuZ3JnYXRuemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU3OTgsImV4cCI6MjA2NjE4MTc5OH0.gleBmte9X1uQWYaTxX-dLWVqk6Hpvb_qjseN_aG6xM0";
const simpleSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface RecalculationResult {
  updatedCount: number;
  errors: string[];
}

/**
 * Sort tasks in topological order based on predecessors
 * Tasks without predecessors come first, then tasks that depend on them, etc.
 */
function topologicalSort(tasks: ProjectTask[]): ProjectTask[] {
  const sorted: ProjectTask[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>(); // For cycle detection
  
  // Build a map of hierarchy number to task for quick lookup
  const taskByHierarchy = new Map<string, ProjectTask>();
  tasks.forEach(t => {
    if (t.hierarchy_number) {
      taskByHierarchy.set(t.hierarchy_number, t);
    }
  });
  
  // Parse predecessors to get hierarchy numbers
  function getPredecessorHierarchies(task: ProjectTask): string[] {
    if (!task.predecessor) return [];
    
    try {
      let preds: string[] = [];
      if (Array.isArray(task.predecessor)) {
        preds = task.predecessor;
      } else if (typeof task.predecessor === 'string') {
        preds = JSON.parse(task.predecessor);
      }
      
      // Extract just the hierarchy number (remove link type like "FS", "SS", etc.)
      return preds.map(p => {
        const match = p.match(/^([\d.]+)/);
        return match ? match[1] : p;
      }).filter(Boolean);
    } catch {
      return [];
    }
  }
  
  function visit(task: ProjectTask) {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) {
      // Cycle detected - skip to avoid infinite loop
      console.warn(`Cycle detected at task ${task.hierarchy_number}`);
      return;
    }
    
    visiting.add(task.id);
    
    // Visit predecessors first
    const predHierarchies = getPredecessorHierarchies(task);
    for (const predHierarchy of predHierarchies) {
      const predTask = taskByHierarchy.get(predHierarchy);
      if (predTask && !visited.has(predTask.id)) {
        visit(predTask);
      }
    }
    
    visiting.delete(task.id);
    visited.add(task.id);
    sorted.push(task);
  }
  
  // Visit all tasks
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visit(task);
    }
  }
  
  return sorted;
}

/**
 * Check if a task is a parent task (has children)
 */
function isParentTask(task: ProjectTask, allTasks: ProjectTask[]): boolean {
  if (!task.hierarchy_number) return false;
  
  return allTasks.some(t => 
    t.hierarchy_number && 
    t.hierarchy_number.startsWith(task.hierarchy_number + '.') &&
    t.id !== task.id
  );
}

/**
 * Recalculate all task dates in a project based on predecessors
 */
export async function recalculateAllTaskDates(
  projectId: string,
  tasks: ProjectTask[],
  userId: string
): Promise<RecalculationResult> {
  const result: RecalculationResult = {
    updatedCount: 0,
    errors: []
  };
  
  if (tasks.length === 0) {
    return result;
  }
  
  console.log(`🔄 Starting schedule recalculation for ${tasks.length} tasks`);
  
  // Create a mutable copy of tasks to track updated values
  const updatedTasks = new Map<string, ProjectTask>();
  tasks.forEach(t => updatedTasks.set(t.id, { ...t }));
  
  // Sort tasks topologically - predecessors before dependents
  const sortedTasks = topologicalSort(tasks);
  console.log(`📊 Topological sort complete. Processing order:`, 
    sortedTasks.slice(0, 10).map(t => t.hierarchy_number).join(', ') + '...');
  
  // First pass: Update leaf tasks (non-parent tasks with predecessors)
  const updates: { id: string; start_date: string; end_date: string; duration: number }[] = [];
  
  for (const task of sortedTasks) {
    // Skip parent tasks - they get calculated from children
    if (isParentTask(task, tasks)) {
      continue;
    }
    
    // Get the current state of this task (may have been updated by a previous iteration)
    const currentTask = updatedTasks.get(task.id)!;
    
    // Build a snapshot of all tasks with current values for predecessor lookup
    const taskSnapshot = Array.from(updatedTasks.values());
    
    // Calculate new dates based on predecessors
    const dateUpdate = calculateTaskDatesFromPredecessors(currentTask, taskSnapshot);
    
    if (dateUpdate) {
      const newStartDate = dateUpdate.startDate + 'T00:00:00';
      const newEndDate = dateUpdate.endDate + 'T00:00:00';
      
      // Check if dates actually changed
      if (currentTask.start_date.split('T')[0] !== dateUpdate.startDate ||
          currentTask.end_date.split('T')[0] !== dateUpdate.endDate) {
        
        console.log(`📅 Task ${currentTask.hierarchy_number}: ${currentTask.start_date.split('T')[0]} → ${dateUpdate.startDate}, ${currentTask.end_date.split('T')[0]} → ${dateUpdate.endDate}`);
        
        // Update our tracking map
        updatedTasks.set(task.id, {
          ...currentTask,
          start_date: newStartDate,
          end_date: newEndDate,
          duration: dateUpdate.duration
        });
        
        updates.push({
          id: task.id,
          start_date: newStartDate,
          end_date: newEndDate,
          duration: dateUpdate.duration
        });
      }
    }
  }
  
  // Second pass: Update parent tasks based on their children
  const parentUpdates: { id: string; start_date: string; end_date: string; duration: number; progress: number }[] = [];
  
  // Get all parent tasks, sorted by depth (deepest first so parents of parents get updated correctly)
  const parentTasks = tasks
    .filter(t => isParentTask(t, tasks))
    .sort((a, b) => {
      const aDepth = (a.hierarchy_number || '').split('.').length;
      const bDepth = (b.hierarchy_number || '').split('.').length;
      return bDepth - aDepth; // Deeper parents first
    });
  
  for (const parentTask of parentTasks) {
    const taskSnapshot = Array.from(updatedTasks.values());
    const calculations = calculateParentTaskValues(parentTask, taskSnapshot);
    
    if (calculations) {
      const currentTask = updatedTasks.get(parentTask.id)!;
      
      // Check if values changed
      if (currentTask.start_date.split('T')[0] !== calculations.startDate ||
          currentTask.end_date.split('T')[0] !== calculations.endDate ||
          currentTask.duration !== calculations.duration) {
        
        console.log(`📁 Parent ${parentTask.hierarchy_number}: ${currentTask.start_date.split('T')[0]} → ${calculations.startDate}, ${currentTask.end_date.split('T')[0]} → ${calculations.endDate}`);
        
        const newStartDate = calculations.startDate + 'T00:00:00';
        const newEndDate = calculations.endDate + 'T00:00:00';
        
        // Update tracking map
        updatedTasks.set(parentTask.id, {
          ...currentTask,
          start_date: newStartDate,
          end_date: newEndDate,
          duration: calculations.duration,
          progress: calculations.progress
        });
        
        parentUpdates.push({
          id: parentTask.id,
          start_date: newStartDate,
          end_date: newEndDate,
          duration: calculations.duration,
          progress: calculations.progress
        });
      }
    }
  }
  
  // Batch update to database
  const allUpdates = [...updates, ...parentUpdates];
  
  if (allUpdates.length === 0) {
    console.log('✅ No updates needed - all dates are correct');
    return result;
  }
  
  console.log(`💾 Saving ${allUpdates.length} updates to database...`);
  
  // Update in batches to avoid overwhelming the database
  const BATCH_SIZE = 50;
  for (let i = 0; i < allUpdates.length; i += BATCH_SIZE) {
    const batch = allUpdates.slice(i, i + BATCH_SIZE);
    
    // Use update for each task
    for (const update of batch) {
      try {
        // Build update object
        const updateObj: Record<string, unknown> = {
          start_date: update.start_date,
          end_date: update.end_date,
          duration: update.duration,
          updated_at: new Date().toISOString()
        };
        
        // Add progress if it exists in the update
        if ('progress' in update && typeof update.progress === 'number') {
          updateObj.progress = update.progress;
        }
        
        const { error } = await simpleSupabase
          .from('project_schedule_tasks')
          .update(updateObj)
          .eq('id', update.id)
          .eq('user_id', userId);
        
        if (error) {
          console.error(`❌ Failed to update task ${update.id}:`, error);
          result.errors.push(`Failed to update task: ${error.message}`);
        } else {
          result.updatedCount++;
        }
      } catch (err) {
        console.error(`❌ Exception updating task ${update.id}:`, err);
        result.errors.push(`Exception updating task: ${err}`);
      }
    }
  }
  
  console.log(`✅ Schedule recalculation complete. Updated ${result.updatedCount} tasks.`);
  
  return result;
}
