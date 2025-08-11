import { ProjectTask } from "@/hooks/useProjectTasks";

/**
 * Get the parent hierarchy number from a given hierarchy number
 * Example: "1.2.3" -> "1.2"
 */
export function getParentHierarchy(hierarchyNumber: string): string | null {
  if (!hierarchyNumber) return null;
  const parts = hierarchyNumber.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

/**
 * Get all children of a task based on hierarchy number
 */
export function getChildren(tasks: ProjectTask[], parentHierarchy: string): ProjectTask[] {
  if (!parentHierarchy) return [];
  return tasks.filter(task => 
    task.hierarchy_number && 
    task.hierarchy_number.startsWith(parentHierarchy + ".") &&
    task.hierarchy_number.split(".").length === parentHierarchy.split(".").length + 1
  );
}

/**
 * Get the hierarchy level (indentation level)
 */
export function getLevel(hierarchyNumber: string): number {
  if (!hierarchyNumber) return 0;
  return hierarchyNumber.split(".").length - 1;
}

/**
 * Check if a task can be indented (has a suitable parent)
 */
export function canIndent(task: ProjectTask, tasks: ProjectTask[]): boolean {
  if (!task.hierarchy_number) return false;
  
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  if (currentIndex <= 0) return false;
  
  const currentLevel = getLevel(task.hierarchy_number);
  
  // Look for a task at the same level that can be a parent
  for (let i = currentIndex - 1; i >= 0; i--) {
    const potentialParent = sortedTasks[i];
    const parentLevel = getLevel(potentialParent.hierarchy_number || "");
    
    if (parentLevel === currentLevel) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a task can be outdented
 */
export function canOutdent(task: ProjectTask): boolean {
  if (!task.hierarchy_number) return false;
  return getLevel(task.hierarchy_number) > 0;
}

/**
 * Generate a new hierarchy number for indenting a task
 */
export function generateIndentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  if (!canIndent(task, tasks)) return null;
  
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  const currentLevel = getLevel(task.hierarchy_number!);
  
  // Find the parent task (last task at same level)
  for (let i = currentIndex - 1; i >= 0; i--) {
    const potentialParent = sortedTasks[i];
    const parentLevel = getLevel(potentialParent.hierarchy_number || "");
    
    if (parentLevel === currentLevel) {
      // Found parent, calculate next child number
      const children = getChildren(tasks, potentialParent.hierarchy_number!);
      const nextChildNumber = children.length + 1;
      return `${potentialParent.hierarchy_number}.${nextChildNumber}`;
    }
  }
  
  return null;
}

/**
 * Generate a new hierarchy number for outdenting a task
 */
export function generateOutdentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  if (!canOutdent(task)) return null;
  
  const parentHierarchy = getParentHierarchy(task.hierarchy_number!);
  if (!parentHierarchy) {
    // Move to top level
    const topLevelTasks = tasks.filter(t => 
      t.hierarchy_number && !t.hierarchy_number.includes(".")
    );
    const nextTopLevel = topLevelTasks.length + 1;
    return nextTopLevel.toString();
  }
  
  // Move to parent's level as next sibling
  const parentParent = getParentHierarchy(parentHierarchy);
  const siblings = parentParent 
    ? getChildren(tasks, parentParent)
    : tasks.filter(t => t.hierarchy_number && !t.hierarchy_number.includes("."));
  
  const nextSiblingNumber = siblings.length + 1;
  return parentParent ? `${parentParent}.${nextSiblingNumber}` : nextSiblingNumber.toString();
}

/**
 * Renumber all tasks to ensure clean sequential numbering
 */
export function renumberTasks(tasks: ProjectTask[]): ProjectTask[] {
  // Sort tasks by hierarchy for proper processing
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const result = [...sortedTasks];
  const numberMap = new Map<string, string>();
  
  // First pass: assign new numbers to top-level tasks
  let topLevelCounter = 1;
  result.forEach(task => {
    if (task.hierarchy_number && !task.hierarchy_number.includes(".")) {
      const newNumber = topLevelCounter.toString();
      numberMap.set(task.hierarchy_number, newNumber);
      task.hierarchy_number = newNumber;
      topLevelCounter++;
    }
  });
  
  // Subsequent passes: handle each level
  let hasChanges = true;
  while (hasChanges) {
    hasChanges = false;
    result.forEach(task => {
      if (!task.hierarchy_number || !task.hierarchy_number.includes(".")) return;
      
      const parentHierarchy = getParentHierarchy(task.hierarchy_number);
      if (!parentHierarchy || !numberMap.has(parentHierarchy)) return;
      
      const newParent = numberMap.get(parentHierarchy)!;
      const siblings = result.filter(t => 
        t.hierarchy_number && 
        getParentHierarchy(t.hierarchy_number) === parentHierarchy
      );
      
      const siblingIndex = siblings.findIndex(s => s.id === task.id) + 1;
      const newNumber = `${newParent}.${siblingIndex}`;
      
      if (task.hierarchy_number !== newNumber) {
        numberMap.set(task.hierarchy_number, newNumber);
        task.hierarchy_number = newNumber;
        hasChanges = true;
      }
    });
  }
  
  return result;
}

/**
 * Generate a new hierarchy number based on the target position in the task list
 */
export function generateHierarchyNumber(tasks: ProjectTask[], targetIndex: number): string {
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  if (targetIndex === 0) {
    return "1";
  }

  if (targetIndex >= sortedTasks.length) {
    const lastTask = sortedTasks[sortedTasks.length - 1];
    if (!lastTask?.hierarchy_number) {
      return "1";
    }
    
    const nextNum = getNextHierarchyNumber(lastTask.hierarchy_number);
    return nextNum;
  }

  const prevTask = sortedTasks[targetIndex - 1];
  const nextTask = sortedTasks[targetIndex];
  
  if (!prevTask?.hierarchy_number) {
    return "1";
  }
  
  if (!nextTask?.hierarchy_number) {
    return getNextHierarchyNumber(prevTask.hierarchy_number);
  }

  return generateBetweenNumbers(prevTask.hierarchy_number, nextTask.hierarchy_number);
}

/**
 * Parse hierarchy number to get the main numeric value
 */
function parseHierarchyNumber(hierarchyNumber: string): number {
  const parts = hierarchyNumber.split(".");
  return parseInt(parts[0]) || 0;
}

/**
 * Get the next hierarchy number after the given one
 */
function getNextHierarchyNumber(hierarchyNumber: string): string {
  const parts = hierarchyNumber.split(".");
  const lastPart = parseInt(parts[parts.length - 1]) || 0;
  
  if (parts.length === 1) {
    return (lastPart + 1).toString();
  }
  
  const parentParts = parts.slice(0, -1);
  return parentParts.join(".") + "." + (lastPart + 1);
}

/**
 * Generate a hierarchy number between two existing numbers
 */
function generateBetweenNumbers(before: string, after: string): string {
  const beforeParts = before ? before.split(".").map(n => parseInt(n) || 0) : [0];
  const afterParts = after.split(".").map(n => parseInt(n) || 0);
  
  // Make both arrays the same length
  const maxLength = Math.max(beforeParts.length, afterParts.length);
  while (beforeParts.length < maxLength) beforeParts.push(0);
  while (afterParts.length < maxLength) afterParts.push(0);
  
  // Find the first differing position
  for (let i = 0; i < maxLength; i++) {
    const beforeVal = beforeParts[i];
    const afterVal = afterParts[i];
    
    if (afterVal - beforeVal > 1) {
      // We can insert a number in between at this level
      const newParts = beforeParts.slice(0, i + 1);
      newParts[i] = beforeVal + 1;
      return newParts.join(".");
    } else if (afterVal === beforeVal) {
      // Same value at this level, continue to next level
      continue;
    } else if (afterVal === beforeVal + 1) {
      // Adjacent numbers, need to go to next level
      if (i === maxLength - 1) {
        // We're at the end, add a sub-level
        return before + ".1";
      }
      // Continue to next level
      continue;
    }
  }
  
  // If we get here, add a sub-level to the before number
  return before + ".1";
}

/**
 * Get the visual indentation level from hierarchy number
 */
export function getIndentLevel(hierarchyNumber: string): number {
  if (!hierarchyNumber) return 0;
  return Math.max(0, hierarchyNumber.split(".").length - 1);
}

/**
 * Check if a task is a child of another task
 */
export function isChildOf(childHierarchy: string, parentHierarchy: string): boolean {
  if (!childHierarchy || !parentHierarchy) return false;
  return childHierarchy.startsWith(parentHierarchy + ".");
}

/**
 * Get all descendants of a task
 */
export function getDescendants(tasks: ProjectTask[], parentHierarchy: string): ProjectTask[] {
  return tasks.filter(task => 
    task.hierarchy_number && isChildOf(task.hierarchy_number, parentHierarchy)
  );
}