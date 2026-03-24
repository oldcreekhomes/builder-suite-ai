import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors, PredecessorUpdate } from "./predecessorRemapping";

export interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

export { PredecessorUpdate };

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

  const hierarchyParts = targetTask.hierarchy_number.split('.');
  const isTargetGroup = hierarchyParts.length === 1;
  
  if (isTargetGroup) {
    return handleAddBelowGroup(targetTask, allTasks);
  } else {
    return handleAddBelowChild(targetTask, allTasks);
  }
}

function handleAddBelowGroup(targetTask: ProjectTask, allTasks: ProjectTask[]): AddBelowResult {
  const targetNumber = targetTask.hierarchy_number!;
  
  const existingChildren = allTasks.filter(task =>
    task.hierarchy_number?.startsWith(targetNumber + '.')
  );
  
  if (existingChildren.length === 0) {
    return { newTaskHierarchy: `${targetNumber}.1`, hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  const maxChildNumber = Math.max(
    ...existingChildren.map(task => parseInt(task.hierarchy_number!.split('.')[1]) || 0)
  );
  
  return { newTaskHierarchy: `${targetNumber}.${maxChildNumber + 1}`, hierarchyUpdates: [], predecessorUpdates: [] };
}

function handleAddBelowChild(targetTask: ProjectTask, allTasks: ProjectTask[]): AddBelowResult {
  const parts = targetTask.hierarchy_number!.split('.');
  const groupNumber = parts[0];
  const childNumber = parseInt(parts[1]);
  const newTaskHierarchy = `${groupNumber}.${childNumber + 1}`;
  
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    return parseInt(taskParts[1]) > childNumber;
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
