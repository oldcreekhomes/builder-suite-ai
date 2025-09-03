import { ProjectTask } from "@/hooks/useProjectTasks";

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

export interface ParsedPredecessor {
  taskId: string;
  lagDays: number;
  displayName: string;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function parsePredecessors(predecessors: any, allTasks: ProjectTask[]): ParsedPredecessor[] {
  const predecessorArray = safeParsePredecessors(predecessors);
  return predecessorArray.map(pred => {
    // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd" 
    const match = pred.trim().match(/^(.+?)([+-]\d+d?)?$/);
    if (!match) {
      return {
        taskId: pred.trim(),
        lagDays: 0,
        displayName: `${pred.trim()}: Invalid format`,
        isValid: false
      };
    }
    
    const taskId = match[1].trim();
    const lagPart = match[2] || '';
    
    // Extract lag days (e.g., "+3d" -> 3, "-2d" -> -2, "+5" -> 5)
    let lagDays = 0;
    if (lagPart) {
      // Remove 'd' suffix if present and parse the number
      const lagStr = lagPart.endsWith('d') ? lagPart.slice(0, -1) : lagPart;
      const lagValue = parseInt(lagStr);
      if (!isNaN(lagValue)) {
        lagDays = lagValue;
      }
    }

    // Find the task to get display name (support both hierarchy number and task ID)
    const task = allTasks.find(t => t.hierarchy_number === taskId || t.id === taskId);
    const displayName = task ? `${taskId}: ${task.task_name}` : `${taskId}: Task not found`;
    const isValid = !!task;

    return {
      taskId,
      lagDays,
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
        // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd"
        const match = pred.trim().match(/^(.+?)([+-]\d+d?)?$/);
        if (!match) continue;
        const predTaskId = match[1].trim();
        if (hasCycle(predTaskId)) {
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
    // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd"
    const match = pred.trim().match(/^(.+?)([+-]\d+d?)?$/);
    if (!match) continue;
    const predTaskId = match[1].trim();
    visited.clear();
    path.length = 0;
    path.push(currentTask.hierarchy_number!);
    
    if (hasCycle(predTaskId)) {
      // Build the cycle path for error message
      const cycleStart = path.indexOf(predTaskId);
      if (cycleStart >= 0) {
        return [...path.slice(cycleStart), predTaskId];
      }
    }
  }

  return [];
}

function findDuplicates(array: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  for (const item of array) {
    // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd"
    const match = item.trim().match(/^(.+?)([+-]\d+d?)?$/);
    if (!match) continue;
    const taskId = match[1].trim();
    if (seen.has(taskId)) {
      duplicates.add(taskId);
    }
    seen.add(taskId);
  }
  
  return Array.from(duplicates);
}

export function formatPredecessorForDisplay(pred: ParsedPredecessor): string {
  if (pred.lagDays > 0) {
    return `${pred.displayName} +${pred.lagDays}d`;
  } else if (pred.lagDays < 0) {
    return `${pred.displayName} ${pred.lagDays}d`;
  }
  return pred.displayName;
}

export function formatPredecessorForStorage(taskId: string, lagDays: number): string {
  if (lagDays > 0) {
    return `${taskId}+${lagDays}d`;
  } else if (lagDays < 0) {
    return `${taskId}${lagDays}d`;
  }
  return taskId;
}

export function getTasksWithDependency(targetTaskId: string, allTasks: ProjectTask[]): ProjectTask[] {
  const dependentTasks: ProjectTask[] = [];

  for (const task of allTasks) {
    if (task.predecessor) {
      const predecessors = safeParsePredecessors(task.predecessor);
      const hasDependency = predecessors.some((pred: string) => {
        // Parse predecessor format: "taskId" or "taskId+Nd" or "taskId-Nd"
        const match = pred.trim().match(/^(.+?)([+-]\d+d?)?$/);
        if (!match) return false;
        const predTaskId = match[1].trim();
        return predTaskId === targetTaskId;
      });

      if (hasDependency) {
        dependentTasks.push(task);
      }
    }
  }

  return dependentTasks;
}