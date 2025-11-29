import { ProjectTask } from "@/hooks/useProjectTasks";
import { safeParsePredecessors } from "./predecessorValidation";

export interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

export interface PredecessorUpdate {
  taskId: string;
  oldPredecessors: string[];
  newPredecessors: string[];
}

export interface AddBelowResult {
  newTaskHierarchy: string;
  hierarchyUpdates: HierarchyUpdate[];
  predecessorUpdates: PredecessorUpdate[];
}

/**
 * Calculate all updates needed when adding a task below another task
 */
export function calculateAddBelowUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): AddBelowResult {
  if (!targetTask.hierarchy_number) {
    throw new Error("Target task must have a hierarchy number");
  }

  const targetHierarchy = targetTask.hierarchy_number;
  const hierarchyParts = targetHierarchy.split('.');
  
  // Determine if we're adding below a group or a child
  const isTargetGroup = hierarchyParts.length === 1;
  
  if (isTargetGroup) {
    return handleAddBelowGroup(targetTask, allTasks);
  } else {
    return handleAddBelowChild(targetTask, allTasks);
  }
}

/**
 * Handle adding below a group (top-level task)
 * Creates a CHILD task under the group (not a sibling group)
 * e.g., "Add Below" on task "1" creates "1.1" (or "1.N+1" if children exist)
 */
function handleAddBelowGroup(targetTask: ProjectTask, allTasks: ProjectTask[]): AddBelowResult {
  const targetNumber = targetTask.hierarchy_number!;
  
  // Check if this group has existing children
  const existingChildren = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    return task.hierarchy_number.startsWith(targetNumber + '.');
  });
  
  if (existingChildren.length === 0) {
    // No children - create first child (e.g., "1" -> "1.1")
    return {
      newTaskHierarchy: `${targetNumber}.1`,
      hierarchyUpdates: [],
      predecessorUpdates: []
    };
  }
  
  // Has children - add after the last child (no renumbering needed)
  const childNumbers = existingChildren.map(task => {
    const parts = task.hierarchy_number!.split('.');
    return parseInt(parts[1]) || 0;
  });
  const maxChildNumber = Math.max(...childNumbers);
  
  return {
    newTaskHierarchy: `${targetNumber}.${maxChildNumber + 1}`,
    hierarchyUpdates: [],
    predecessorUpdates: []
  };
}

/**
 * Handle adding below a child task
 * Creates a new child and renumbers only siblings AFTER the target within the same group
 */
function handleAddBelowChild(targetTask: ProjectTask, allTasks: ProjectTask[]): AddBelowResult {
  const targetHierarchy = targetTask.hierarchy_number!;
  const parts = targetHierarchy.split('.');
  const groupNumber = parts[0];
  const childNumber = parseInt(parts[1]);
  
  // New task goes AFTER target, so it gets childNumber + 1
  const newTaskHierarchy = `${groupNumber}.${childNumber + 1}`;
  
  // Find siblings in the same group that need renumbering (AFTER the target, not including target)
  // Key difference from Add Above: we use > instead of >=
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    
    const taskChildNumber = parseInt(taskParts[1]);
    return taskChildNumber > childNumber; // > not >= (target keeps its position)
  });
  
  // Sort siblings by child number in DESCENDING order to avoid conflicts
  siblingsToRenumber.sort((a, b) => {
    const aChild = parseInt(a.hierarchy_number!.split('.')[1]);
    const bChild = parseInt(b.hierarchy_number!.split('.')[1]);
    return bChild - aChild;
  });
  
  // Generate hierarchy updates (increment child numbers)
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();
  
  siblingsToRenumber.forEach(task => {
    const taskParts = task.hierarchy_number!.split('.');
    const taskChildNumber = parseInt(taskParts[1]);
    const newChildNumber = taskChildNumber + 1;
    const newHierarchy = `${groupNumber}.${newChildNumber}`;
    
    hierarchyMapping.set(task.hierarchy_number!, newHierarchy);
    hierarchyUpdates.push({
      id: task.id,
      hierarchy_number: newHierarchy
    });
  });
  
  // Generate predecessor updates
  const predecessorUpdates = calculatePredecessorUpdates(allTasks, hierarchyMapping);
  
  return {
    newTaskHierarchy,
    hierarchyUpdates,
    predecessorUpdates
  };
}

/**
 * Calculate which tasks need their predecessors updated due to hierarchy changes
 */
function calculatePredecessorUpdates(
  allTasks: ProjectTask[],
  hierarchyMapping: Map<string, string>
): PredecessorUpdate[] {
  const predecessorUpdates: PredecessorUpdate[] = [];
  
  allTasks.forEach(task => {
    if (!task.predecessor) return;
    
    const predecessors = safeParsePredecessors(task.predecessor);
    if (predecessors.length === 0) return;
    
    const newPredecessors = predecessors.map(pred => {
      return hierarchyMapping.get(pred) || pred;
    });
    
    // Check if any predecessors changed
    const changed = predecessors.some((pred, index) => pred !== newPredecessors[index]);
    
    if (changed) {
      predecessorUpdates.push({
        taskId: task.id,
        oldPredecessors: predecessors,
        newPredecessors: newPredecessors
      });
    }
  });
  
  return predecessorUpdates;
}
