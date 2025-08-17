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
 * Remaps predecessor references when hierarchy numbers change
 */
export const remapPredecessors = (
  allTasks: ProjectTask[],
  hierarchyMapping: Map<string, string>
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
    
    // Remap predecessor hierarchy numbers
    const remappedPredecessors = predecessors.map(predStr => {
      const match = predStr.match(/^(.+?)([+-]\d+)?$/);
      if (!match) return predStr;
      
      const predTaskId = match[1].trim();
      const lag = match[2] || '';
      
      // Check if this predecessor's hierarchy changed
      const newHierarchy = hierarchyMapping.get(predTaskId);
      return newHierarchy ? `${newHierarchy}${lag}` : predStr;
    });
    
    // Only update if predecessors changed
    if (JSON.stringify(predecessors) !== JSON.stringify(remappedPredecessors)) {
      updates.push({
        taskId: task.id,
        newPredecessors: remappedPredecessors
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
  
  // Build hierarchy mapping for predecessor remapping
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  // Cleanup deleted references and remap changed hierarchies
  const cleanupUpdates = cleanupPredecessors(allTasks, [targetTask.hierarchy_number]);
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  // Merge predecessor updates (cleanup takes precedence over remapping)
  const predecessorUpdatesMap = new Map<string, string[]>();
  remapUpdates.forEach(update => predecessorUpdatesMap.set(update.taskId, update.newPredecessors));
  cleanupUpdates.forEach(update => predecessorUpdatesMap.set(update.taskId, update.newPredecessors));
  
  const predecessorUpdates: PredecessorUpdate[] = Array.from(predecessorUpdatesMap.entries()).map(
    ([taskId, newPredecessors]) => ({ taskId, newPredecessors })
  );
  
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
  
  // Build hierarchy mapping for predecessor remapping
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  // Cleanup deleted references and remap changed hierarchies
  const cleanupUpdates = cleanupPredecessors(allTasks, deletedHierarchyNumbers);
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  // Merge predecessor updates (cleanup takes precedence over remapping)
  const predecessorUpdatesMap = new Map<string, string[]>();
  remapUpdates.forEach(update => predecessorUpdatesMap.set(update.taskId, update.newPredecessors));
  cleanupUpdates.forEach(update => predecessorUpdatesMap.set(update.taskId, update.newPredecessors));
  
  const predecessorUpdates: PredecessorUpdate[] = Array.from(predecessorUpdatesMap.entries()).map(
    ([taskId, newPredecessors]) => ({ taskId, newPredecessors })
  );
  
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
 * Computes updates needed when deleting multiple tasks (bulk delete)
 * Handles complex scenarios with mixed groups and children
 */
export const computeBulkDeleteUpdates = (
  selectedTaskIds: string[],
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  const selectedTasks = allTasks.filter(task => selectedTaskIds.includes(task.id));
  
  console.log(`🗑️ BULK DELETE: Processing ${selectedTasks.length} selected tasks`);
  
  // Separate groups and children
  const selectedGroups = selectedTasks.filter(isGroupTask);
  const selectedChildren = selectedTasks.filter(task => !isGroupTask(task));
  
  // Find children that belong to selected groups (these don't need separate processing)
  const childrenOfSelectedGroups = selectedChildren.filter(child => {
    const groupNumber = child.hierarchy_number?.split('.')[0];
    return selectedGroups.some(group => group.hierarchy_number === groupNumber);
  });
  
  // Only process children that don't belong to selected groups
  const independentChildren = selectedChildren.filter(child => {
    const groupNumber = child.hierarchy_number?.split('.')[0];
    return !selectedGroups.some(group => group.hierarchy_number === groupNumber);
  });
  
  console.log(`📊 Found: ${selectedGroups.length} groups, ${independentChildren.length} independent children, ${childrenOfSelectedGroups.length} children of selected groups`);
  
  // Get all tasks that will be deleted (groups + their children + independent children)
  let allTasksToDelete: string[] = [...selectedTaskIds];
  let deletedHierarchyNumbers: string[] = [];
  
  // Add children of selected groups to deletion list
  for (const group of selectedGroups) {
    const groupChildren = allTasks.filter(task => 
      task.hierarchy_number?.startsWith(group.hierarchy_number! + '.') && 
      !selectedTaskIds.includes(task.id)
    );
    allTasksToDelete.push(...groupChildren.map(t => t.id));
    deletedHierarchyNumbers.push(group.hierarchy_number!);
    deletedHierarchyNumbers.push(...groupChildren.map(t => t.hierarchy_number!));
  }
  
  // Add independent children hierarchy numbers
  deletedHierarchyNumbers.push(...independentChildren.map(t => t.hierarchy_number!));
  
  // Now calculate what hierarchy updates are needed
  let hierarchyUpdates: TaskUpdate[] = [];
  let parentGroupsToRecalculate: string[] = [];
  
  // Handle independent children first (within their groups)
  const childrenByGroup = new Map<string, ProjectTask[]>();
  for (const child of independentChildren) {
    const groupNumber = child.hierarchy_number!.split('.')[0];
    if (!childrenByGroup.has(groupNumber)) {
      childrenByGroup.set(groupNumber, []);
    }
    childrenByGroup.get(groupNumber)!.push(child);
    parentGroupsToRecalculate.push(groupNumber);
  }
  
  // For each group with deleted children, renumber remaining children
  for (const [groupNumber, deletedChildren] of childrenByGroup.entries()) {
    const allChildrenInGroup = allTasks.filter(task => {
      if (!task.hierarchy_number) return false;
      const parts = task.hierarchy_number.split('.');
      return parts.length === 2 && parts[0] === groupNumber;
    });
    
    // Sort by child number
    allChildrenInGroup.sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.')[1]);
      const bNum = parseInt(b.hierarchy_number!.split('.')[1]);
      return aNum - bNum;
    });
    
    // Find which children remain after deletion
    const remainingChildren = allChildrenInGroup.filter(child => 
      !deletedChildren.some(deleted => deleted.id === child.id)
    );
    
    // Renumber remaining children sequentially
    remainingChildren.forEach((child, index) => {
      const newHierarchy = `${groupNumber}.${index + 1}`;
      if (child.hierarchy_number !== newHierarchy) {
        hierarchyUpdates.push({
          id: child.id,
          hierarchy_number: newHierarchy
        });
      }
    });
  }
  
  // Handle group deletions - need to shift all groups that come after deleted groups
  if (selectedGroups.length > 0) {
    // Get all group numbers that are being deleted, sorted
    const deletedGroupNumbers = selectedGroups
      .map(g => parseInt(g.hierarchy_number!))
      .sort((a, b) => a - b);
    
    console.log(`🔢 Deleted group numbers: ${deletedGroupNumbers.join(', ')}`);
    
    // Find all groups that need to be renumbered (groups with numbers higher than any deleted group)
    const minDeletedGroup = Math.min(...deletedGroupNumbers);
    const groupsToRenumber = allTasks.filter(task => {
      if (!task.hierarchy_number || !isGroupTask(task)) return false;
      const groupNum = parseInt(task.hierarchy_number);
      return groupNum > minDeletedGroup && !deletedGroupNumbers.includes(groupNum);
    });
    
    // Sort groups by number
    groupsToRenumber.sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!);
      const bNum = parseInt(b.hierarchy_number!);
      return aNum - bNum;
    });
    
    console.log(`📋 Groups to renumber: ${groupsToRenumber.map(g => g.hierarchy_number).join(', ')}`);
    
    // Calculate how many groups were deleted before each remaining group
    for (const group of groupsToRenumber) {
      const currentGroupNum = parseInt(group.hierarchy_number!);
      const deletedBefore = deletedGroupNumbers.filter(deleted => deleted < currentGroupNum).length;
      const newGroupNum = currentGroupNum - deletedBefore;
      
      console.log(`🔄 Group ${currentGroupNum} -> ${newGroupNum} (${deletedBefore} deleted before)`);
      
      // Update the group itself
      hierarchyUpdates.push({
        id: group.id,
        hierarchy_number: `${newGroupNum}`
      });
      
      // Update all children of this group
      const childrenOfThisGroup = allTasks.filter(task => {
        if (!task.hierarchy_number) return false;
        const parts = task.hierarchy_number.split('.');
        return parts.length === 2 && parts[0] === currentGroupNum.toString();
      });
      
      for (const child of childrenOfThisGroup) {
        const childNum = child.hierarchy_number!.split('.')[1];
        hierarchyUpdates.push({
          id: child.id,
          hierarchy_number: `${newGroupNum}.${childNum}`
        });
      }
    }
  }
  
  // Build hierarchy mapping for predecessor remapping
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  // Cleanup deleted references and remap changed hierarchies
  const cleanupUpdates = cleanupPredecessors(allTasks, deletedHierarchyNumbers);
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  // Merge predecessor updates (cleanup takes precedence over remapping)
  const predecessorUpdatesMap = new Map<string, string[]>();
  remapUpdates.forEach(update => predecessorUpdatesMap.set(update.taskId, update.newPredecessors));
  cleanupUpdates.forEach(update => predecessorUpdatesMap.set(update.taskId, update.newPredecessors));
  
  const predecessorUpdates: PredecessorUpdate[] = Array.from(predecessorUpdatesMap.entries()).map(
    ([taskId, newPredecessors]) => ({ taskId, newPredecessors })
  );
  
  // Remove duplicates from parent groups to recalculate
  parentGroupsToRecalculate = [...new Set(parentGroupsToRecalculate)];
  
  console.log(`✅ Bulk delete result: ${allTasksToDelete.length} tasks to delete, ${hierarchyUpdates.length} hierarchy updates, ${predecessorUpdates.length} predecessor updates`);
  
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
  if (isGroupTask(targetTask)) {
    return computeDeleteGroupUpdates(targetTask, allTasks);
  } else {
    return computeDeleteChildUpdates(targetTask, allTasks);
  }
};