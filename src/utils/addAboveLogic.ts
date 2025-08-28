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

export interface AddAboveResult {
  newTaskHierarchy: string;
  hierarchyUpdates: HierarchyUpdate[];
  predecessorUpdates: PredecessorUpdate[];
}

/**
 * Calculate all updates needed when adding a task above another task
 */
export function calculateAddAboveUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): AddAboveResult {
  if (!targetTask.hierarchy_number) {
    throw new Error("Target task must have a hierarchy number");
  }

  const targetHierarchy = targetTask.hierarchy_number;
  const hierarchyParts = targetHierarchy.split('.');
  
  // Determine if we're adding above a group or a child
  const isTargetGroup = hierarchyParts.length === 1;
  
  if (isTargetGroup) {
    return handleAddAboveGroup(targetTask, allTasks);
  } else {
    return handleAddAboveChild(targetTask, allTasks);
  }
}

/**
 * Handle adding above a group (top-level task)
 * Creates a new group and renumbers all subsequent groups
 */
function handleAddAboveGroup(targetTask: ProjectTask, allTasks: ProjectTask[]): AddAboveResult {
  const targetNumber = parseInt(targetTask.hierarchy_number!);
  const newTaskHierarchy = targetNumber.toString();
  
  // Find all tasks that need renumbering (groups >= target and their children)
  const tasksToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    
    const firstPart = parseInt(task.hierarchy_number.split('.')[0]);
    return firstPart >= targetNumber;
  });
  
  // Sort by hierarchy in DESCENDING order to avoid conflicts
  tasksToRenumber.sort((a, b) => {
    const aHier = a.hierarchy_number!;
    const bHier = b.hierarchy_number!;
    return bHier.localeCompare(aHier, undefined, { numeric: true });
  });
  
  // Generate hierarchy updates (increment group numbers)
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();
  
  tasksToRenumber.forEach(task => {
    const parts = task.hierarchy_number!.split('.');
    const groupNumber = parseInt(parts[0]);
    const newGroupNumber = groupNumber + 1;
    
    let newHierarchy: string;
    if (parts.length === 1) {
      // Group level
      newHierarchy = newGroupNumber.toString();
    } else {
      // Child level - update the group part
      newHierarchy = [newGroupNumber, ...parts.slice(1)].join('.');
    }
    
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
 * Handle adding above a child task
 * Creates a new child and renumbers only siblings below within the same group
 */
function handleAddAboveChild(targetTask: ProjectTask, allTasks: ProjectTask[]): AddAboveResult {
  const targetHierarchy = targetTask.hierarchy_number!;
  const parts = targetHierarchy.split('.');
  const groupNumber = parts[0];
  const childNumber = parseInt(parts[1]);
  
  const newTaskHierarchy = `${groupNumber}.${childNumber}`;
  
  // Find siblings in the same group that need renumbering (INCLUDING the target)
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    
    const taskChildNumber = parseInt(taskParts[1]);
    return taskChildNumber >= childNumber;
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