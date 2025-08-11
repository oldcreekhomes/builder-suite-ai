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

export function canIndent(task: ProjectTask, tasks: ProjectTask[]): boolean {
  if (!task.hierarchy_number) return false;
  
  // Sort tasks by hierarchy for proper processing
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  // Find the current task's position
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  
  // Can only indent if there's a task above it
  return currentIndex > 0;
}

export function canOutdent(task: ProjectTask): boolean {
  return false; // Disabled during refactoring
}

export function generateIndentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  if (!task.hierarchy_number) return null;
  
  // Sort tasks by hierarchy for proper processing
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  // Find the current task's position
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  
  // Can't indent if there's no task above
  if (currentIndex <= 0) return null;
  
  const previousTask = sortedTasks[currentIndex - 1];
  const parentHierarchy = previousTask.hierarchy_number;
  
  if (!parentHierarchy) return null;
  
  // Find all existing children of the previous task
  const existingChildren = tasks.filter(t => 
    t.hierarchy_number && 
    t.hierarchy_number.startsWith(parentHierarchy + ".") &&
    t.hierarchy_number.split(".").length === parentHierarchy.split(".").length + 1
  );
  
  // Calculate the next child number
  const nextChildNumber = existingChildren.length + 1;
  
  return `${parentHierarchy}.${nextChildNumber}`;
}

/**
 * Generate all updates needed for indenting a task
 * This includes the indented task and renumbering of subsequent parent-level tasks
 */
export function generateIndentUpdates(task: ProjectTask, tasks: ProjectTask[]): Array<{id: string, hierarchy_number: string}> {
  if (!task.hierarchy_number) return [];
  
  const originalNumber = parseInt(task.hierarchy_number.split('.')[0]);
  const newHierarchy = generateIndentHierarchy(task, tasks);
  
  if (!newHierarchy) return [];
  
  // Check if the new hierarchy number would create a duplicate
  const existingTaskWithHierarchy = tasks.find(t => 
    t.id !== task.id && t.hierarchy_number === newHierarchy
  );
  
  if (existingTaskWithHierarchy) {
    console.warn(`Cannot indent: hierarchy number "${newHierarchy}" already exists`);
    return [];
  }
  
  const updates: Array<{id: string, hierarchy_number: string}> = [];
  
  // Add the indented task update
  updates.push({
    id: task.id,
    hierarchy_number: newHierarchy
  });
  
  // Create a set of existing hierarchy numbers to avoid duplicates
  const existingHierarchies = new Set(tasks.map(t => t.hierarchy_number));
  // Remove the original task's hierarchy since we're changing it
  existingHierarchies.delete(task.hierarchy_number);
  // Add the new hierarchy we're assigning
  existingHierarchies.add(newHierarchy);
  
  // Find all parent-level tasks that need renumbering
  // These are tasks with hierarchy numbers greater than the original number
  const tasksToRenumber = tasks.filter(t => {
    if (!t.hierarchy_number || t.id === task.id) return false;
    
    // Only parent-level tasks (no dots in hierarchy)
    if (t.hierarchy_number.includes('.')) return false;
    
    const taskNumber = parseInt(t.hierarchy_number);
    return taskNumber > originalNumber;
  });
  
  // Renumber by decreasing each by 1, but check for duplicates
  tasksToRenumber.forEach(t => {
    let currentNumber = parseInt(t.hierarchy_number!);
    let newNumber = currentNumber - 1;
    let newHierarchyNumber = newNumber.toString();
    
    // Find the next available number to avoid duplicates
    while (existingHierarchies.has(newHierarchyNumber)) {
      newNumber--;
      newHierarchyNumber = newNumber.toString();
    }
    
    // Add to existing set to track what we're updating
    existingHierarchies.add(newHierarchyNumber);
    
    updates.push({
      id: t.id,
      hierarchy_number: newHierarchyNumber
    });
  });
  
  return updates;
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