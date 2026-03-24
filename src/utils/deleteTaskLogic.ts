import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors } from "./predecessorRemapping";

export interface TaskUpdate {
  id: string;
  hierarchy_number: string;
}

export interface PredecessorUpdate {
  taskId: string;
  newPredecessors: string[];
}

export interface DeleteTaskResult {
  tasksToDelete: string[];
  hierarchyUpdates: TaskUpdate[];
  predecessorUpdates: PredecessorUpdate[];
  parentGroupsToRecalculate: string[];
}

/**
 * Computes updates needed when deleting a child task
 */
export const computeDeleteChildUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  if (!targetTask.hierarchy_number) throw new Error("Target task must have a hierarchy number");
  
  const hierarchyParts = targetTask.hierarchy_number.split('.');
  if (hierarchyParts.length !== 2) throw new Error("Target task must be a child task (e.g., '1.2')");
  
  const groupNumber = hierarchyParts[0];
  const childNumber = parseInt(hierarchyParts[1]);
  
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    return parseInt(taskParts[1]) > childNumber;
  }).sort((a, b) => parseInt(a.hierarchy_number!.split('.')[1]) - parseInt(b.hierarchy_number!.split('.')[1]));
  
  const hierarchyUpdates: TaskUpdate[] = siblingsToRenumber.map(task => ({
    id: task.id,
    hierarchy_number: `${groupNumber}.${parseInt(task.hierarchy_number!.split('.')[1]) - 1}`
  }));
  
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
  });
  
  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping, [targetTask.hierarchy_number]);
  
  return {
    tasksToDelete: [targetTask.id],
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate: [groupNumber]
  };
};

/**
 * Computes updates needed when deleting a group task
 */
export const computeDeleteGroupUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  if (!targetTask.hierarchy_number) throw new Error("Target task must have a hierarchy number");
  
  const groupNumber = parseInt(targetTask.hierarchy_number);
  
  const childrenToDelete = allTasks.filter(task =>
    task.hierarchy_number?.startsWith(targetTask.hierarchy_number + '.') && task.id !== targetTask.id
  );
  
  const allToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    const firstPart = parseInt(task.hierarchy_number.split('.')[0]);
    return firstPart > groupNumber;
  }).sort((a, b) => a.hierarchy_number!.localeCompare(b.hierarchy_number!, undefined, { numeric: true }));
  
  const hierarchyUpdates: TaskUpdate[] = allToRenumber.map(task => {
    const parts = task.hierarchy_number!.split('.');
    const taskGroupNumber = parseInt(parts[0]);
    return parts.length === 1
      ? { id: task.id, hierarchy_number: `${taskGroupNumber - 1}` }
      : { id: task.id, hierarchy_number: `${taskGroupNumber - 1}.${parts[1]}` };
  });
  
  const deletedHierarchyNumbers = [
    targetTask.hierarchy_number,
    ...childrenToDelete.map(task => task.hierarchy_number!)
  ];
  
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
  });
  
  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping, deletedHierarchyNumbers);
  
  return {
    tasksToDelete: [targetTask.id, ...childrenToDelete.map(task => task.id)],
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate: []
  };
};

export const isGroupTask = (task: ProjectTask): boolean => {
  return !!task.hierarchy_number && !task.hierarchy_number.includes('.');
};

/**
 * Computes updates needed when deleting multiple tasks (bulk delete)
 */
export const computeBulkDeleteUpdates = (
  selectedTaskIds: string[],
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  const selectedTasks = allTasks.filter(task => selectedTaskIds.includes(task.id));
  
  const selectedGroups = selectedTasks.filter(isGroupTask);
  const selectedChildren = selectedTasks.filter(task => !isGroupTask(task));
  
  const independentChildren = selectedChildren.filter(child => {
    const groupNumber = child.hierarchy_number?.split('.')[0];
    return !selectedGroups.some(group => group.hierarchy_number === groupNumber);
  });
  
  let allTasksToDelete: string[] = [...selectedTaskIds];
  let deletedHierarchyNumbers: string[] = [];
  let parentGroupsToRecalculate: string[] = [];
  
  // Add children of selected groups
  for (const group of selectedGroups) {
    const groupChildren = allTasks.filter(task =>
      task.hierarchy_number?.startsWith(group.hierarchy_number! + '.') && !selectedTaskIds.includes(task.id)
    );
    allTasksToDelete.push(...groupChildren.map(t => t.id));
    deletedHierarchyNumbers.push(group.hierarchy_number!, ...groupChildren.map(t => t.hierarchy_number!));
  }
  
  deletedHierarchyNumbers.push(...independentChildren.map(t => t.hierarchy_number!));
  
  let hierarchyUpdates: TaskUpdate[] = [];
  
  // Handle independent children (within their groups)
  const childrenByGroup = new Map<string, ProjectTask[]>();
  for (const child of independentChildren) {
    const groupNumber = child.hierarchy_number!.split('.')[0];
    if (!childrenByGroup.has(groupNumber)) childrenByGroup.set(groupNumber, []);
    childrenByGroup.get(groupNumber)!.push(child);
    parentGroupsToRecalculate.push(groupNumber);
  }
  
  for (const [groupNumber, deletedChildren] of childrenByGroup.entries()) {
    const remainingChildren = allTasks
      .filter(task => {
        if (!task.hierarchy_number) return false;
        const parts = task.hierarchy_number.split('.');
        return parts.length === 2 && parts[0] === groupNumber;
      })
      .filter(child => !deletedChildren.some(d => d.id === child.id))
      .sort((a, b) => parseInt(a.hierarchy_number!.split('.')[1]) - parseInt(b.hierarchy_number!.split('.')[1]));
    
    remainingChildren.forEach((child, index) => {
      const newHierarchy = `${groupNumber}.${index + 1}`;
      if (child.hierarchy_number !== newHierarchy) {
        hierarchyUpdates.push({ id: child.id, hierarchy_number: newHierarchy });
      }
    });
  }
  
  // Handle group deletions
  if (selectedGroups.length > 0) {
    const deletedGroupNumbers = selectedGroups
      .map(g => parseInt(g.hierarchy_number!))
      .sort((a, b) => a - b);
    
    const minDeletedGroup = Math.min(...deletedGroupNumbers);
    const groupsToRenumber = allTasks
      .filter(task => {
        if (!task.hierarchy_number || !isGroupTask(task)) return false;
        const groupNum = parseInt(task.hierarchy_number);
        return groupNum > minDeletedGroup && !deletedGroupNumbers.includes(groupNum);
      })
      .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
    
    for (const group of groupsToRenumber) {
      const currentGroupNum = parseInt(group.hierarchy_number!);
      const deletedBefore = deletedGroupNumbers.filter(d => d < currentGroupNum).length;
      const newGroupNum = currentGroupNum - deletedBefore;
      
      hierarchyUpdates.push({ id: group.id, hierarchy_number: `${newGroupNum}` });
      
      allTasks
        .filter(task => {
          if (!task.hierarchy_number) return false;
          const parts = task.hierarchy_number.split('.');
          return parts.length === 2 && parts[0] === currentGroupNum.toString();
        })
        .forEach(child => {
          hierarchyUpdates.push({ id: child.id, hierarchy_number: `${newGroupNum}.${child.hierarchy_number!.split('.')[1]}` });
        });
    }
  }
  
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
  });
  
  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping, deletedHierarchyNumbers);
  parentGroupsToRecalculate = [...new Set(parentGroupsToRecalculate)];
  
  return {
    tasksToDelete: allTasksToDelete,
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate
  };
};

/**
 * Main function to compute all updates needed for task deletion
 */
export const computeDeleteUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  return isGroupTask(targetTask)
    ? computeDeleteGroupUpdates(targetTask, allTasks)
    : computeDeleteChildUpdates(targetTask, allTasks);
};
