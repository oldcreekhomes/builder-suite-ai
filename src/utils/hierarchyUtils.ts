import { ProjectTask } from "@/hooks/useProjectTasks";

/**
 * Generate a new hierarchy number based on the target position in the task list
 */
export function generateHierarchyNumber(tasks: ProjectTask[], targetIndex: number): string {
  // Sort tasks by hierarchy number to determine proper position
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });

  // If inserting at the beginning
  if (targetIndex === 0) {
    const firstTask = sortedTasks[0];
    if (!firstTask?.hierarchy_number) {
      return "1";
    }
    
    const firstNum = parseHierarchyNumber(firstTask.hierarchy_number);
    if (firstNum > 1) {
      return "1";
    }
    
    return generateBetweenNumbers("", firstTask.hierarchy_number);
  }

  // If inserting at the end
  if (targetIndex >= sortedTasks.length) {
    const lastTask = sortedTasks[sortedTasks.length - 1];
    if (!lastTask?.hierarchy_number) {
      return "1";
    }
    
    const nextNum = getNextHierarchyNumber(lastTask.hierarchy_number);
    return nextNum;
  }

  // If inserting in the middle
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