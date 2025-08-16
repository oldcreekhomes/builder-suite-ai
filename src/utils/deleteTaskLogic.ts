import { ProjectTask } from "@/hooks/useProjectTasks";

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
 * Removes references to deleted tasks from predecessor arrays
 */
export const cleanupPredecessors = (
  allTasks: ProjectTask[], 
  deletedHierarchyNumbers: string[]
): PredecessorUpdate[] => {
  const updates: PredecessorUpdate[] = [];
  
  allTasks.forEach(task => {
    if (!task.predecessor) return;
    
    let predecessors: string[] = [];
    try {
      if (Array.isArray(task.predecessor)) {
        predecessors = task.predecessor;
      } else if (typeof task.predecessor === 'string') {
        predecessors = JSON.parse(task.predecessor);
      }
    } catch {
      predecessors = [task.predecessor as string];
    }
    
    // Remove deleted task references
    const cleanedPredecessors = predecessors.filter(predStr => {
      const match = predStr.match(/^(.+?)([+-]\d+)?$/);
      if (!match) return true;
      const predTaskId = match[1].trim();
      return !deletedHierarchyNumbers.includes(predTaskId);
    });
    
    // Only update if predecessors changed
    if (cleanedPredecessors.length !== predecessors.length) {
      updates.push({
        taskId: task.id,
        newPredecessors: cleanedPredecessors
      });
    }
  });
  
  return updates;
};

/**
 * Computes updates needed when deleting a child task
 * Only renumbers siblings below the deleted child within the same group
 */
export const computeDeleteChildUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  if (!targetTask.hierarchy_number) {
    throw new Error("Target task must have a hierarchy number");
  }
  
  const hierarchyParts = targetTask.hierarchy_number.split('.');
  if (hierarchyParts.length !== 2) {
    throw new Error("Target task must be a child task (e.g., '1.2')");
  }
  
  const groupNumber = hierarchyParts[0];
  const childNumber = parseInt(hierarchyParts[1]);
  const parentHierarchy = groupNumber;
  
  console.log(`🗑️ DELETE CHILD: Deleting child ${targetTask.hierarchy_number}`);
  
  // Find siblings in the same group that need renumbering (only those below)
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    
    const taskChildNumber = parseInt(taskParts[1]);
    return taskChildNumber > childNumber; // Only children below
  });
  
  console.log(`📋 Renumbering ${siblingsToRenumber.length} siblings below deleted child`);
  
  // Sort siblings by child number in ascending order (safe for decrementing)
  siblingsToRenumber.sort((a, b) => {
    const aChild = parseInt(a.hierarchy_number!.split('.')[1]);
    const bChild = parseInt(b.hierarchy_number!.split('.')[1]);
    return aChild - bChild;
  });
  
  // Generate hierarchy updates (decrement child numbers)
  const hierarchyUpdates: TaskUpdate[] = siblingsToRenumber.map(task => {
    const taskParts = task.hierarchy_number!.split('.');
    const taskChildNumber = parseInt(taskParts[1]);
    const newChildNumber = taskChildNumber - 1;
    
    return {
      id: task.id,
      hierarchy_number: `${groupNumber}.${newChildNumber}`
    };
  });
  
  // Cleanup predecessors
  const predecessorUpdates = cleanupPredecessors(allTasks, [targetTask.hierarchy_number]);
  
  return {
    tasksToDelete: [targetTask.id],
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate: [parentHierarchy]
  };
};

/**
 * Computes updates needed when deleting a group task
 * Removes group and all children, then renumbers subsequent groups
 */
export const computeDeleteGroupUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  if (!targetTask.hierarchy_number) {
    throw new Error("Target task must have a hierarchy number");
  }
  
  const hierarchyParts = targetTask.hierarchy_number.split('.');
  if (hierarchyParts.length !== 1) {
    throw new Error("Target task must be a group task (e.g., '1')");
  }
  
  const groupNumber = parseInt(hierarchyParts[0]);
  
  console.log(`🗑️ DELETE GROUP: Deleting group ${targetTask.hierarchy_number} and all its children`);
  
  // Find all children of this group
  const childrenToDelete = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    return task.hierarchy_number.startsWith(targetTask.hierarchy_number + '.');
  });
  
  console.log(`👥 Found ${childrenToDelete.length} children to delete with group`);
  
  // Find all groups that need renumbering (groups with higher numbers)
  const groupsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length === 1) {
      // This is a group
      const taskGroupNumber = parseInt(taskParts[0]);
      return taskGroupNumber > groupNumber;
    }
    
    return false;
  });
  
  // Find all children of groups that will be renumbered
  const childrenToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number) return false;
    
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length === 2) {
      // This is a child
      const taskGroupNumber = parseInt(taskParts[0]);
      return taskGroupNumber > groupNumber;
    }
    
    return false;
  });
  
  console.log(`📋 Renumbering ${groupsToRenumber.length} groups and ${childrenToRenumber.length} children`);
  
  // Sort by hierarchy in ascending order (safe for decrementing)
  const allToRenumber = [...groupsToRenumber, ...childrenToRenumber];
  allToRenumber.sort((a, b) => {
    return a.hierarchy_number!.localeCompare(b.hierarchy_number!, undefined, { numeric: true });
  });
  
  // Generate hierarchy updates (decrement group numbers)
  const hierarchyUpdates: TaskUpdate[] = allToRenumber.map(task => {
    const taskParts = task.hierarchy_number!.split('.');
    
    if (taskParts.length === 1) {
      // Group task
      const taskGroupNumber = parseInt(taskParts[0]);
      const newGroupNumber = taskGroupNumber - 1;
      return {
        id: task.id,
        hierarchy_number: `${newGroupNumber}`
      };
    } else {
      // Child task
      const taskGroupNumber = parseInt(taskParts[0]);
      const taskChildNumber = taskParts[1];
      const newGroupNumber = taskGroupNumber - 1;
      return {
        id: task.id,
        hierarchy_number: `${newGroupNumber}.${taskChildNumber}`
      };
    }
  });
  
  // Get all hierarchy numbers that will be deleted
  const deletedHierarchyNumbers = [
    targetTask.hierarchy_number,
    ...childrenToDelete.map(task => task.hierarchy_number!)
  ];
  
  // Cleanup predecessors
  const predecessorUpdates = cleanupPredecessors(allTasks, deletedHierarchyNumbers);
  
  // All tasks to delete
  const tasksToDelete = [targetTask.id, ...childrenToDelete.map(task => task.id)];
  
  return {
    tasksToDelete,
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate: [] // No parent recalculation needed for group deletion
  };
};

/**
 * Determines if a task is a group (hierarchy like "1") or child (hierarchy like "1.2")
 */
export const isGroupTask = (task: ProjectTask): boolean => {
  if (!task.hierarchy_number) return false;
  return !task.hierarchy_number.includes('.');
};

/**
 * Main function to compute all updates needed for task deletion
 */
export const computeDeleteUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  if (isGroupTask(targetTask)) {
    return computeDeleteGroupUpdates(targetTask, allTasks);
  } else {
    return computeDeleteChildUpdates(targetTask, allTasks);
  }
};