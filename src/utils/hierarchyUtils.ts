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

// ALL COMPLEX HIERARCHY FUNCTIONS DISABLED DURING REFACTORING
// Only keeping basic functions for now

// DISABLED: Will be reimplemented step by step
export function canIndent(task: ProjectTask, tasks: ProjectTask[]): boolean {
  return false; // Disabled during refactoring
}

export function canOutdent(task: ProjectTask): boolean {
  return false; // Disabled during refactoring
}

export function generateIndentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  return null; // Disabled during refactoring
}

export function generateOutdentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  return null; // Disabled during refactoring
}

// SIMPLE: Basic renumbering function that actually works
export function renumberTasks(tasks: ProjectTask[]): ProjectTask[] {
  // Sort tasks by hierarchy for proper processing
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const result = [...sortedTasks];
  
  // First: Get all top-level tasks and their original numbers
  const topLevelTasks = result.filter(task => 
    task.hierarchy_number && !task.hierarchy_number.includes(".")
  );
  
  // Create mapping of old parent numbers to new parent numbers
  const parentMapping = new Map<string, string>();
  let topLevelCounter = 1;
  
  topLevelTasks.forEach(task => {
    const oldNumber = task.hierarchy_number!;
    const newNumber = topLevelCounter.toString();
    parentMapping.set(oldNumber, newNumber);
    task.hierarchy_number = newNumber;
    topLevelCounter++;
  });
  
  // Second: Update all children based on the parent mapping
  parentMapping.forEach((newParentNumber, oldParentNumber) => {
    const children = result.filter(task => 
      task.hierarchy_number && 
      task.hierarchy_number.startsWith(oldParentNumber + ".")
    );
    
    // Sort children by their current hierarchy number
    children.sort((a, b) => {
      const aNum = a.hierarchy_number || "999";
      const bNum = b.hierarchy_number || "999";
      return aNum.localeCompare(bNum, undefined, { numeric: true });
    });
    
    // Renumber children sequentially
    let childCounter = 1;
    children.forEach(child => {
      child.hierarchy_number = `${newParentNumber}.${childCounter}`;
      childCounter++;
    });
  });
  
  return result;
}

export function generateHierarchyNumber(tasks: ProjectTask[], targetIndex: number): string {
  return "1"; // Disabled during refactoring - just return "1"
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