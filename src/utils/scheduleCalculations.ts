/**
 * Consolidated schedule calculations - combines taskCalculations.ts and predecessorValidation.ts logic
 * Single source of truth for all task date/duration/progress calculations
 */

import { ProjectTask } from "@/hooks/useProjectTasks";
import { 
  getBusinessDaysBetween, 
  calculateBusinessEndDate, 
  addBusinessDays, 
  getNextBusinessDay, 
  formatYMD 
} from "./businessDays";

// ==================== PREDECESSOR PARSING ====================

/**
 * Safely parse predecessors from any format (string, array, or JSON string)
 */
export function safeParsePredecessors(predecessors: any): string[] {
  if (!predecessors) return [];
  
  if (Array.isArray(predecessors)) {
    return predecessors.filter(p => typeof p === 'string' && p.trim().length > 0);
  }
  
  if (typeof predecessors === 'string') {
    const trimmed = predecessors.trim();
    if (!trimmed) return [];
    
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => typeof p === 'string' && p.trim().length > 0);
      }
    } catch {
      // Not JSON, treat as single predecessor
    }
    
    return [trimmed];
  }
  
  return [];
}

/**
 * Parse predecessor string to extract task ID and lag days
 * Supports formats: "1.2", "1.2+3d", "1.2-2d", "1.2+5", "1.2-3"
 */
export function parsePredecessorString(predStr: string): { taskId: string; lagDays: number } {
  const match = predStr.trim().match(/^(.+?)([+-]\d+d?)?$/);
  if (!match) {
    return { taskId: predStr.trim(), lagDays: 0 };
  }
  
  const taskId = match[1].trim();
  let lagDays = 0;
  
  if (match[2]) {
    const lagStr = match[2].endsWith('d') ? match[2].slice(0, -1) : match[2];
    lagDays = parseInt(lagStr) || 0;
  }
  
  return { taskId, lagDays };
}

// ==================== DATE CALCULATIONS ====================

export interface TaskDateUpdate {
  startDate: string;
  endDate: string;
  duration: number;
}

/**
 * Calculate task dates based on predecessors
 * Returns the new start date, end date, and duration
 */
export function calculateTaskDatesFromPredecessors(
  task: ProjectTask,
  allTasks: ProjectTask[]
): TaskDateUpdate | null {
  if (!task.predecessor) return null;
  
  const predecessors = safeParsePredecessors(task.predecessor);
  if (predecessors.length === 0) return null;
  
  let latestEndDate = new Date(0);
  
  for (const predStr of predecessors) {
    const { taskId, lagDays } = parsePredecessorString(predStr);
    
    // Find predecessor task by hierarchy number or ID
    const predTask = allTasks.find(t => 
      t.hierarchy_number === taskId || t.id === taskId
    );
    
    if (!predTask) continue;
    
    // Parse end date as local date
    const predEndDateStr = predTask.end_date.split('T')[0];
    const [year, month, day] = predEndDateStr.split('-').map(Number);
    const predEndDate = new Date(year, month - 1, day);
    
    // Apply lag using business days
    const adjustedPredEndDate = lagDays !== 0 
      ? addBusinessDays(predEndDate, lagDays)
      : predEndDate;
    
    if (adjustedPredEndDate > latestEndDate) {
      latestEndDate = adjustedPredEndDate;
    }
  }
  
  if (latestEndDate.getTime() === 0) return null;
  
  // New start date is next business day after latest predecessor end
  const newStartDate = getNextBusinessDay(latestEndDate);
  const newEndDate = calculateBusinessEndDate(newStartDate, task.duration);
  
  return {
    startDate: formatYMD(newStartDate),
    endDate: formatYMD(newEndDate),
    duration: task.duration
  };
}

// ==================== PARENT CALCULATIONS ====================

export interface ParentCalculations {
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
}

/**
 * Parse ISO date string as local date (ignoring timezone)
 */
function toLocalDate(isoDateString: string): Date {
  const dateOnly = isoDateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get all descendant tasks of a parent
 */
export function getAllDescendantTasks(parentTask: ProjectTask, allTasks: ProjectTask[]): ProjectTask[] {
  if (!parentTask.hierarchy_number) return [];
  
  return allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === parentTask.id) return false;
    return task.hierarchy_number.startsWith(parentTask.hierarchy_number + '.');
  });
}

/**
 * Calculate parent task values (dates, duration, progress) from children
 */
export function calculateParentTaskValues(
  parentTask: ProjectTask,
  allTasks: ProjectTask[]
): ParentCalculations | null {
  const childTasks = getAllDescendantTasks(parentTask, allTasks);
  
  if (childTasks.length === 0) return null;
  
  // Calculate start date (earliest among children)
  const startDates = childTasks.map(task => toLocalDate(task.start_date));
  const earliestStartDate = new Date(Math.min(...startDates.map(d => d.getTime())));
  
  // Calculate end date (latest among children)
  const endDates = childTasks.map(task => toLocalDate(task.end_date));
  const latestEndDate = new Date(Math.max(...endDates.map(d => d.getTime())));
  
  // Calculate duration as sum of all child durations
  const duration = childTasks.reduce((sum, task) => sum + task.duration, 0);
  
  // Calculate progress based on completed duration
  const totalDuration = childTasks.reduce((sum, task) => sum + task.duration, 0);
  const completedDuration = childTasks.reduce((sum, task) => {
    const taskProgress = (task.progress || 0) / 100;
    return sum + (task.duration * taskProgress);
  }, 0);
  const progress = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
  
  return {
    startDate: formatYMD(earliestStartDate),
    endDate: formatYMD(latestEndDate),
    duration,
    progress
  };
}

/**
 * Check if parent task needs updating based on calculated values
 */
export function shouldUpdateParentTask(task: ProjectTask, calculations: ParentCalculations): boolean {
  return (
    task.start_date.split('T')[0] !== calculations.startDate ||
    task.end_date.split('T')[0] !== calculations.endDate ||
    task.duration !== calculations.duration ||
    (task.progress || 0) !== calculations.progress
  );
}

// ==================== DEPENDENCY TRACKING ====================

/**
 * Get all tasks that depend on a given task (have it as predecessor)
 */
export function getDependentTasks(taskId: string, allTasks: ProjectTask[]): ProjectTask[] {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return [];
  
  const taskHierarchy = task.hierarchy_number;
  
  return allTasks.filter(t => {
    if (!t.predecessor || t.id === taskId) return false;
    
    const predecessors = safeParsePredecessors(t.predecessor);
    
    return predecessors.some(predStr => {
      const { taskId: predTaskId } = parsePredecessorString(predStr);
      return predTaskId === taskId || predTaskId === taskHierarchy;
    });
  });
}

/**
 * Get all parent tasks that need recalculation for a given hierarchy
 */
export function getParentHierarchies(hierarchyNumber: string): string[] {
  if (!hierarchyNumber) return [];
  
  const parts = hierarchyNumber.split('.');
  const parents: string[] = [];
  
  for (let i = 1; i < parts.length; i++) {
    parents.push(parts.slice(0, i).join('.'));
  }
  
  return parents.reverse(); // Deepest first
}

// ==================== BATCH CALCULATION ====================

export interface BatchUpdateResult {
  dependentUpdates: Array<{ id: string; start_date: string; end_date: string; duration: number }>;
  parentUpdates: Array<{ id: string; start_date: string; end_date: string; duration: number; progress: number }>;
}

/**
 * Calculate ALL updates needed when a task changes
 * This computes everything in memory first, then returns all updates as a batch
 */
export function calculateAllUpdates(
  changedTaskId: string,
  allTasks: ProjectTask[]
): BatchUpdateResult {
  const dependentUpdates: BatchUpdateResult['dependentUpdates'] = [];
  const parentUpdates: BatchUpdateResult['parentUpdates'] = [];
  
  // Create a working copy of tasks for calculations
  const workingTasks = allTasks.map(t => ({ ...t }));
  
  // 1. Calculate dependent task updates (cascade)
  const queue: string[] = [changedTaskId];
  const processed = new Set<string>();
  const maxDepth = 25;
  let depth = 0;
  
  while (queue.length > 0 && depth < maxDepth) {
    const currentTaskId = queue.shift()!;
    
    if (processed.has(currentTaskId)) continue;
    processed.add(currentTaskId);
    
    const dependentTasks = getDependentTasks(currentTaskId, workingTasks);
    
    for (const depTask of dependentTasks) {
      const dateUpdate = calculateTaskDatesFromPredecessors(depTask, workingTasks);
      if (!dateUpdate) continue;
      
      const currentStartDate = depTask.start_date.split('T')[0];
      const currentEndDate = depTask.end_date.split('T')[0];
      
      if (currentStartDate !== dateUpdate.startDate || currentEndDate !== dateUpdate.endDate) {
        dependentUpdates.push({
          id: depTask.id,
          start_date: dateUpdate.startDate,
          end_date: dateUpdate.endDate,
          duration: dateUpdate.duration
        });
        
        // Update working copy for next level calculations
        const taskIndex = workingTasks.findIndex(t => t.id === depTask.id);
        if (taskIndex !== -1) {
          workingTasks[taskIndex] = {
            ...workingTasks[taskIndex],
            start_date: dateUpdate.startDate + 'T00:00:00',
            end_date: dateUpdate.endDate + 'T00:00:00',
            duration: dateUpdate.duration
          };
        }
        
        // Add to queue for further cascade
        queue.push(depTask.id);
      }
    }
    
    depth++;
  }
  
  // 2. Calculate parent task updates
  // Find all unique parent hierarchies that need recalculation
  const parentsToRecalc = new Set<string>();
  
  // Add parents of the changed task
  const changedTask = workingTasks.find(t => t.id === changedTaskId);
  if (changedTask?.hierarchy_number) {
    getParentHierarchies(changedTask.hierarchy_number).forEach(h => parentsToRecalc.add(h));
  }
  
  // Add parents of all dependent tasks that were updated
  for (const update of dependentUpdates) {
    const task = workingTasks.find(t => t.id === update.id);
    if (task?.hierarchy_number) {
      getParentHierarchies(task.hierarchy_number).forEach(h => parentsToRecalc.add(h));
    }
  }
  
  // Calculate updates for each parent
  for (const parentHierarchy of parentsToRecalc) {
    const parentTask = workingTasks.find(t => t.hierarchy_number === parentHierarchy);
    if (!parentTask) continue;
    
    const calculations = calculateParentTaskValues(parentTask, workingTasks);
    if (!calculations) continue;
    
    if (shouldUpdateParentTask(parentTask, calculations)) {
      parentUpdates.push({
        id: parentTask.id,
        start_date: calculations.startDate,
        end_date: calculations.endDate,
        duration: calculations.duration,
        progress: calculations.progress
      });
      
      // Update working copy for further parent calculations
      const taskIndex = workingTasks.findIndex(t => t.id === parentTask.id);
      if (taskIndex !== -1) {
        workingTasks[taskIndex] = {
          ...workingTasks[taskIndex],
          start_date: calculations.startDate + 'T00:00:00',
          end_date: calculations.endDate + 'T00:00:00',
          duration: calculations.duration,
          progress: calculations.progress
        };
      }
    }
  }
  
  return { dependentUpdates, parentUpdates };
}

// ==================== PREDECESSOR VALIDATION ====================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if one task is an ancestor of another
 */
function isAncestor(ancestorHierarchy: string, descendantHierarchy: string): boolean {
  if (!ancestorHierarchy || !descendantHierarchy) return false;
  return descendantHierarchy.startsWith(ancestorHierarchy + '.') || 
         descendantHierarchy === ancestorHierarchy;
}

/**
 * Validate predecessors for a task
 */
export function validatePredecessors(
  currentTaskId: string,
  predecessors: any,
  allTasks: ProjectTask[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const predecessorArray = safeParsePredecessors(predecessors);
  if (predecessorArray.length === 0) {
    return { isValid: true, errors, warnings };
  }

  const currentTask = allTasks.find(t => t.id === currentTaskId);
  if (!currentTask) {
    errors.push("Current task not found");
    return { isValid: false, errors, warnings };
  }

  // Parse all predecessors
  const parsedPredecessors = predecessorArray.map(pred => {
    const { taskId } = parsePredecessorString(pred);
    const task = allTasks.find(t => t.hierarchy_number === taskId || t.id === taskId);
    return { taskId, isValid: !!task };
  });

  // Check for self-references
  if (parsedPredecessors.some(pred => pred.taskId === currentTask.hierarchy_number)) {
    errors.push("A task cannot be its own predecessor");
  }

  // Check for invalid task references
  const invalidRefs = parsedPredecessors.filter(pred => !pred.isValid);
  if (invalidRefs.length > 0) {
    errors.push(`Invalid task references: ${invalidRefs.map(ref => ref.taskId).join(', ')}`);
  }

  // Check for parent-child predecessor relationships
  const parentPredecessors = parsedPredecessors.filter(pred => {
    return pred.isValid && currentTask.hierarchy_number && 
           isAncestor(pred.taskId, currentTask.hierarchy_number);
  });
  if (parentPredecessors.length > 0) {
    errors.push(`A parent task cannot be a predecessor of its child`);
  }

  // Check for duplicates
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const pred of parsedPredecessors) {
    if (seen.has(pred.taskId)) {
      duplicates.push(pred.taskId);
    }
    seen.add(pred.taskId);
  }
  if (duplicates.length > 0) {
    warnings.push(`Duplicate predecessors: ${duplicates.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
