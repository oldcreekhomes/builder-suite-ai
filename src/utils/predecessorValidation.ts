import { ProjectTask } from "@/hooks/useProjectTasks";
import { addBusinessDays } from "@/utils/dateOnly";

/**
 * Safely parse predecessors from any format (string, array, or JSON string) 
 * Always returns a string array
 */
export function safeParsePredecessors(predecessors: any): string[] {
  // Handle null, undefined, empty cases
  if (!predecessors) return [];
  
  // Already an array
  if (Array.isArray(predecessors)) {
    return predecessors.filter(p => typeof p === 'string' && p.trim().length > 0);
  }
  
  // String that might be JSON
  if (typeof predecessors === 'string') {
    const trimmed = predecessors.trim();
    if (!trimmed) return [];
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => typeof p === 'string' && p.trim().length > 0);
      }
    } catch {
      // Not JSON, treat as single predecessor
    }
    
    // Single predecessor string
    return [trimmed];
  }
  
  // Unknown format
  return [];
}

export type LinkType = 'FS' | 'SF';

export interface ParsedPredecessor {
  taskId: string;
  lagDays: number;
  linkType: LinkType;
  displayName: string;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Regex to parse predecessor format: "taskId", "taskIdSF", "taskId+Nd", "taskIdSF-Nd"
// Group 1: taskId, Group 2: optional SF, Group 3: optional lag (+Nd or -Nd)
const PREDECESSOR_REGEX = /^(.+?)(SF)?([+-]\d+d?)?$/i;

export function parsePredecessorString(pred: string): { taskId: string; linkType: LinkType; lagDays: number } | null {
  const match = pred.trim().match(PREDECESSOR_REGEX);
  if (!match) return null;
  
  const taskId = match[1].trim();
  const linkType: LinkType = match[2]?.toUpperCase() === 'SF' ? 'SF' : 'FS';
  const lagPart = match[3] || '';
  
  // Extract lag days (e.g., "+3d" -> 3, "-2d" -> -2, "+5" -> 5)
  let lagDays = 0;
  if (lagPart) {
    const lagStr = lagPart.endsWith('d') ? lagPart.slice(0, -1) : lagPart;
    const lagValue = parseInt(lagStr);
    if (!isNaN(lagValue)) {
      lagDays = lagValue;
    }
  }
  
  return { taskId, linkType, lagDays };
}

export function parsePredecessors(predecessors: any, allTasks: ProjectTask[]): ParsedPredecessor[] {
  const predecessorArray = safeParsePredecessors(predecessors);
  return predecessorArray.map(pred => {
    const parsed = parsePredecessorString(pred);
    
    if (!parsed) {
      return {
        taskId: pred.trim(),
        lagDays: 0,
        linkType: 'FS' as LinkType,
        displayName: `${pred.trim()}: Invalid format`,
        isValid: false
      };
    }
    
    const { taskId, linkType, lagDays } = parsed;

    // Find the task to get display name (support both hierarchy number and task ID)
    const task = allTasks.find(t => t.hierarchy_number === taskId || t.id === taskId);
    const displayName = task ? `${taskId}: ${task.task_name}` : `${taskId}: Task not found`;
    const isValid = !!task;

    return {
      taskId,
      lagDays,
      linkType,
      displayName,
      isValid
    };
  });
}

// Helper function to check if one task is an ancestor of another
function isAncestor(ancestorHierarchy: string, descendantHierarchy: string): boolean {
  if (!ancestorHierarchy || !descendantHierarchy) return false;
  
  // An ancestor's hierarchy number should be a prefix of the descendant's
  // e.g., "2" is ancestor of "2.1", "2.1.3", etc.
  return descendantHierarchy.startsWith(ancestorHierarchy + '.') || 
         descendantHierarchy === ancestorHierarchy;
}

export function validatePredecessors(
  currentTaskId: string,
  predecessors: any,
  allTasks: ProjectTask[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse and validate predecessors
  const predecessorArray = safeParsePredecessors(predecessors);
  if (predecessorArray.length === 0) {
    return { isValid: true, errors, warnings };
  }

  const currentTask = allTasks.find(t => t.id === currentTaskId);
  if (!currentTask) {
    errors.push("Current task not found");
    return { isValid: false, errors, warnings };
  }

  const parsedPredecessors = parsePredecessors(predecessorArray, allTasks);

  // Check for self-references
  const selfRefs = parsedPredecessors.filter(pred => pred.taskId === currentTask.hierarchy_number);
  if (selfRefs.length > 0) {
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
    errors.push(`A parent task cannot be a predecessor of its child. Invalid: ${parentPredecessors.map(pred => pred.taskId).join(', ')}`);
  }

  // Check for circular dependencies
  const circularDeps = detectCircularDependencies(currentTask, predecessors, allTasks);
  if (circularDeps.length > 0) {
    errors.push(`Circular dependency detected: ${circularDeps.join(' → ')}`);
  }

  // Check for duplicate predecessors
  const duplicates = findDuplicates(predecessorArray);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate predecessors: ${duplicates.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function detectCircularDependencies(
  currentTask: ProjectTask,
  predecessors: any,
  allTasks: ProjectTask[]
): string[] {
  const visited = new Set<string>();
  const path: string[] = [];

  function hasCycle(taskHierarchy: string): boolean {
    if (visited.has(taskHierarchy)) {
      // Found a cycle - return the path from the cycle start
      const cycleStart = path.indexOf(taskHierarchy);
      if (cycleStart >= 0) {
        return true;
      }
    }

    visited.add(taskHierarchy);
    path.push(taskHierarchy);

    // Get predecessors for this task
    const task = allTasks.find(t => t.hierarchy_number === taskHierarchy);
    if (task && task.predecessor) {
      const taskPredecessors = safeParsePredecessors(task.predecessor);
      for (const pred of taskPredecessors) {
        const parsed = parsePredecessorString(pred);
        if (!parsed) continue;
        if (hasCycle(parsed.taskId)) {
          return true;
        }
      }
    }

    path.pop();
    return false;
  }

  // Check if adding these predecessors would create a cycle
  const predecessorArray = safeParsePredecessors(predecessors);
  for (const pred of predecessorArray) {
    const parsed = parsePredecessorString(pred);
    if (!parsed) continue;
    visited.clear();
    path.length = 0;
    path.push(currentTask.hierarchy_number!);
    
    if (hasCycle(parsed.taskId)) {
      // Build the cycle path for error message
      const cycleStart = path.indexOf(parsed.taskId);
      if (cycleStart >= 0) {
        return [...path.slice(cycleStart), parsed.taskId];
      }
    }
  }

  return [];
}

function findDuplicates(array: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  for (const item of array) {
    const parsed = parsePredecessorString(item);
    if (!parsed) continue;
    if (seen.has(parsed.taskId)) {
      duplicates.add(parsed.taskId);
    }
    seen.add(parsed.taskId);
  }
  
  return Array.from(duplicates);
}

export function formatPredecessorForDisplay(pred: ParsedPredecessor): string {
  let result = pred.displayName;
  
  // Add link type if SF
  if (pred.linkType === 'SF') {
    result += ' SF';
  }
  
  // Add lag days
  if (pred.lagDays > 0) {
    result += ` +${pred.lagDays}d`;
  } else if (pred.lagDays < 0) {
    result += ` ${pred.lagDays}d`;
  }
  
  return result;
}

export function formatPredecessorForStorage(taskId: string, lagDays: number, linkType: LinkType = 'FS'): string {
  let result = taskId;
  
  // Add link type if SF
  if (linkType === 'SF') {
    result += 'SF';
  }
  
  // Add lag days
  if (lagDays > 0) {
    result += `+${lagDays}d`;
  } else if (lagDays < 0) {
    result += `${lagDays}d`;
  }
  
  return result;
}

export function getTasksWithDependency(targetTaskId: string, allTasks: ProjectTask[]): ProjectTask[] {
  const dependentTasks: ProjectTask[] = [];

  for (const task of allTasks) {
    if (task.predecessor) {
      const predecessors = safeParsePredecessors(task.predecessor);
      const hasDependency = predecessors.some((pred: string) => {
        const parsed = parsePredecessorString(pred);
        if (!parsed) return false;
        return parsed.taskId === targetTaskId;
      });

      if (hasDependency) {
        dependentTasks.push(task);
      }
    }
  }

  return dependentTasks;
}

/**
 * Validate that a task's start date is on or after its predecessor's end date (plus lag days)
 * Note: This validation only applies to FS relationships. SF relationships are validated differently.
 */
export interface StartDateValidationResult {
  isValid: boolean;
  error: string | null;
  minAllowedDate: string | null;
  predecessorInfo: string | null;
}

export function validateStartDateAgainstPredecessors(
  task: ProjectTask,
  newStartDate: string,
  allTasks: ProjectTask[]
): StartDateValidationResult {
  // If task has no predecessor, any start date is valid
  if (!task.predecessor) {
    return { isValid: true, error: null, minAllowedDate: null, predecessorInfo: null };
  }

  const predecessorArray = safeParsePredecessors(task.predecessor);
  if (predecessorArray.length === 0) {
    return { isValid: true, error: null, minAllowedDate: null, predecessorInfo: null };
  }

  // Normalize the new start date to YYYY-MM-DD format
  const newStartYmd = newStartDate.split('T')[0];

  // Find the latest predecessor end date (including lag days) - only for FS relationships
  let latestPredEndDate: string | null = null;
  let latestPredInfo: string | null = null;

  for (const pred of predecessorArray) {
    const parsed = parsePredecessorString(pred);
    if (!parsed) continue;
    
    // Skip SF relationships - they constrain end date, not start date
    if (parsed.linkType === 'SF') continue;

    const { taskId: predTaskId, lagDays } = parsed;

    // Find the predecessor task (by hierarchy number or task ID)
    const predTask = allTasks.find(t => t.hierarchy_number === predTaskId || t.id === predTaskId);
    if (!predTask || !predTask.end_date) continue;

    // Calculate effective end date (predecessor end + lag days)
    const predEndYmd = predTask.end_date.split('T')[0];
    
    // The minimum start date is the day AFTER predecessor ends (plus lag)
    // So we add 1 + lagDays business days from the predecessor end date
    const minStartDate = addBusinessDays(predEndYmd, 1 + lagDays);

    if (!latestPredEndDate || minStartDate > latestPredEndDate) {
      latestPredEndDate = minStartDate;
      latestPredInfo = predTaskId;
    }
  }

  // If no valid FS predecessor found, allow any date
  if (!latestPredEndDate) {
    return { isValid: true, error: null, minAllowedDate: null, predecessorInfo: null };
  }

  // Compare dates
  if (newStartYmd < latestPredEndDate) {
    return {
      isValid: false,
      error: `Start date must be on or after ${latestPredEndDate} (after predecessor ${latestPredInfo} ends)`,
      minAllowedDate: latestPredEndDate,
      predecessorInfo: latestPredInfo
    };
  }

  return { isValid: true, error: null, minAllowedDate: latestPredEndDate, predecessorInfo: latestPredInfo };
}
