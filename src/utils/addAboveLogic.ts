import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors, PredecessorUpdate } from "./predecessorRemapping";

export interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

export { PredecessorUpdate };

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

  const hierarchyParts = targetTask.hierarchy_number.split('.');
  const isTargetGroup = hierarchyParts.length === 1;
  
  if (isTargetGroup) {
    return handleAddAboveGroup(targetTask, allTasks);
  } else {
    return handleAddAboveChild(targetTask, allTasks);
  }
}

function handleAddAboveGroup(targetTask: ProjectTask, allTasks: ProjectTask[]): AddAboveResult {
  const targetNumber = parseInt(targetTask.hierarchy_number!);
  const newTaskHierarchy = targetNumber.toString();
  
  const tasksToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    const firstPart = parseInt(task.hierarchy_number.split('.')[0]);
    return firstPart >= targetNumber;
  });
  
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();
  
  tasksToRenumber.forEach(task => {
    const parts = task.hierarchy_number!.split('.');
    const groupNumber = parseInt(parts[0]);
    const newGroupNumber = groupNumber + 1;
    const newHierarchy = parts.length === 1
      ? newGroupNumber.toString()
      : [newGroupNumber, ...parts.slice(1)].join('.');
    
    hierarchyMapping.set(task.hierarchy_number!, newHierarchy);
    hierarchyUpdates.push({ id: task.id, hierarchy_number: newHierarchy });
  });
  
  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping);
  
  return { newTaskHierarchy, hierarchyUpdates, predecessorUpdates };
}

function handleAddAboveChild(targetTask: ProjectTask, allTasks: ProjectTask[]): AddAboveResult {
  const parts = targetTask.hierarchy_number!.split('.');
  const groupNumber = parts[0];
  const childNumber = parseInt(parts[1]);
  const newTaskHierarchy = `${groupNumber}.${childNumber}`;
  
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    return parseInt(taskParts[1]) >= childNumber;
  });
  
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();
  
  siblingsToRenumber.forEach(task => {
    const taskParts = task.hierarchy_number!.split('.');
    const newChildNumber = parseInt(taskParts[1]) + 1;
    const newHierarchy = `${groupNumber}.${newChildNumber}`;
    
    hierarchyMapping.set(task.hierarchy_number!, newHierarchy);
    hierarchyUpdates.push({ id: task.id, hierarchy_number: newHierarchy });
  });
  
  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping);
  
  return { newTaskHierarchy, hierarchyUpdates, predecessorUpdates };
}
