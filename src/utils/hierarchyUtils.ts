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
  
  // Check if the previous task is already a child (has dots)
  const isChildTask = parentHierarchy.includes('.');
  
  if (isChildTask) {
    // Previous task is a child, so make current task a sibling under the same parent
    const parentParts = parentHierarchy.split('.');
    const immediateParent = parentParts.slice(0, -1).join('.');
    
    // Find all existing children of the immediate parent at the same level
    const existingChildren = tasks.filter(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(immediateParent + ".") &&
      t.hierarchy_number.split(".").length === parentParts.length
    );
    
    // Calculate the next sibling number
    const nextSiblingNumber = existingChildren.length + 1;
    
    return `${immediateParent}.${nextSiblingNumber}`;
  } else {
    // Previous task is a parent, so make current task its child
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
}

/**
 * Validate that all parts of a hierarchy number are positive integers
 */
function isValidHierarchyNumber(hierarchyNumber: string): boolean {
  if (!hierarchyNumber) return false;
  const parts = hierarchyNumber.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return !isNaN(num) && num > 0;
  });
}

/**
 * Generate all updates needed for indenting a task
 * This includes the indented task and renumbering of subsequent parent-level tasks
 */
export function generateIndentUpdates(task: ProjectTask, tasks: ProjectTask[]): Array<{id: string, hierarchy_number: string}> {
  if (!task.hierarchy_number) return [];
  
  const originalNumber = parseInt(task.hierarchy_number.split('.')[0]);
  const newHierarchy = generateIndentHierarchy(task, tasks);
  
  if (!newHierarchy || !isValidHierarchyNumber(newHierarchy)) return [];
  
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
  
  // Find all parent-level tasks that need renumbering (shift down by 1)
  // These are tasks with hierarchy numbers greater than the original number
  const tasksToRenumber = tasks.filter(t => {
    if (!t.hierarchy_number || t.id === task.id) return false;
    
    // Only parent-level tasks (no dots in hierarchy)
    if (t.hierarchy_number.includes('.')) return false;
    
    const taskNumber = parseInt(t.hierarchy_number);
    return taskNumber > originalNumber;
  }).sort((a, b) => {
    const aNum = parseInt(a.hierarchy_number!);
    const bNum = parseInt(b.hierarchy_number!);
    return aNum - bNum; // Sort ascending for proper sequential processing
  });
  
  // Create a mapping of old hierarchy numbers to track what's being updated
  const hierarchyMapping = new Map<string, string>();
  
  // Process tasks sequentially: 3→2, 4→3, 5→4, etc.
  tasksToRenumber.forEach(t => {
    const currentNumber = parseInt(t.hierarchy_number!);
    const newNumber = currentNumber - 1;
    
    // Validate the new number is positive
    if (newNumber <= 0) {
      console.warn(`Cannot renumber task ${t.id}: would result in non-positive hierarchy number ${newNumber}`);
      return;
    }
    
    const newHierarchyNumber = newNumber.toString();
    
    // Validate the new hierarchy number
    if (!isValidHierarchyNumber(newHierarchyNumber)) {
      console.warn(`Cannot renumber task ${t.id}: invalid hierarchy number ${newHierarchyNumber}`);
      return;
    }
    
    hierarchyMapping.set(t.hierarchy_number!, newHierarchyNumber);
    
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
  
  // Deep clone all tasks to avoid mutation
  const result = sortedTasks.map(task => ({ ...task }));
  
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