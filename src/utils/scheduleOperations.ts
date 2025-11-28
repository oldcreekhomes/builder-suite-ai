/**
 * Consolidated schedule operations - combines hierarchy operations:
 * - Delete task logic
 * - Indent/Outdent logic  
 * - Drag-drop reorder logic
 * - Hierarchy normalization
 * 
 * Single source of truth for all hierarchy manipulation operations
 */

import { ProjectTask } from "@/hooks/useProjectTasks";
import { safeParsePredecessors, parsePredecessorString } from "./scheduleCalculations";

// ==================== SHARED TYPES ====================

export interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

export interface PredecessorUpdate {
  taskId: string;
  newPredecessors: string[] | null;
}

export interface OperationResult {
  hierarchyUpdates: HierarchyUpdate[];
  predecessorUpdates: PredecessorUpdate[];
  tasksToDelete?: string[];
  parentGroupsToRecalculate?: string[];
}

// ==================== SHARED HELPERS ====================

/**
 * Remap predecessors when hierarchy numbers change
 */
export function remapPredecessors(
  allTasks: ProjectTask[],
  hierarchyMapping: Map<string, string>
): PredecessorUpdate[] {
  const updates: PredecessorUpdate[] = [];
  
  allTasks.forEach(task => {
    if (!task.predecessor) return;
    
    const predecessors = safeParsePredecessors(task.predecessor);
    if (predecessors.length === 0) return;
    
    let hasChanges = false;
    const newPredecessors = predecessors.map(predStr => {
      const { taskId, lagDays } = parsePredecessorString(predStr);
      const newHierarchy = hierarchyMapping.get(taskId);
      
      if (newHierarchy) {
        hasChanges = true;
        return lagDays !== 0 
          ? `${newHierarchy}${lagDays > 0 ? '+' : ''}${lagDays}d`
          : newHierarchy;
      }
      return predStr;
    });
    
    if (hasChanges) {
      updates.push({ taskId: task.id, newPredecessors });
    }
  });
  
  return updates;
}

/**
 * Remove deleted task references from predecessors
 */
export function cleanupPredecessors(
  allTasks: ProjectTask[],
  deletedHierarchyNumbers: string[]
): PredecessorUpdate[] {
  const updates: PredecessorUpdate[] = [];
  
  allTasks.forEach(task => {
    if (!task.predecessor) return;
    
    const predecessors = safeParsePredecessors(task.predecessor);
    
    const cleanedPredecessors = predecessors.filter(predStr => {
      const { taskId } = parsePredecessorString(predStr);
      return !deletedHierarchyNumbers.includes(taskId);
    });
    
    if (cleanedPredecessors.length !== predecessors.length) {
      updates.push({
        taskId: task.id,
        newPredecessors: cleanedPredecessors.length > 0 ? cleanedPredecessors : null
      });
    }
  });
  
  return updates;
}

/**
 * Check if task is a group (top-level) vs child
 */
export function isGroupTask(task: ProjectTask): boolean {
  return !!task.hierarchy_number && !task.hierarchy_number.includes('.');
}

// ==================== DELETE OPERATIONS ====================

/**
 * Compute updates needed when deleting a child task
 */
export function computeDeleteChildUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): OperationResult {
  const hierarchyParts = targetTask.hierarchy_number!.split('.');
  const groupNumber = hierarchyParts[0];
  const childNumber = parseInt(hierarchyParts[1]);
  
  // Find siblings below that need renumbering
  const siblingsToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    const taskParts = task.hierarchy_number.split('.');
    if (taskParts.length !== 2 || taskParts[0] !== groupNumber) return false;
    return parseInt(taskParts[1]) > childNumber;
  });
  
  // Sort ascending for safe decrement
  siblingsToRenumber.sort((a, b) => {
    const aChild = parseInt(a.hierarchy_number!.split('.')[1]);
    const bChild = parseInt(b.hierarchy_number!.split('.')[1]);
    return aChild - bChild;
  });
  
  // Generate hierarchy updates
  const hierarchyUpdates: HierarchyUpdate[] = siblingsToRenumber.map(task => {
    const taskParts = task.hierarchy_number!.split('.');
    const newChildNumber = parseInt(taskParts[1]) - 1;
    return { id: task.id, hierarchy_number: `${groupNumber}.${newChildNumber}` };
  });
  
  // Build mapping and update predecessors
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  const cleanupUpdates = cleanupPredecessors(allTasks, [targetTask.hierarchy_number!]);
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  // Merge predecessor updates
  const predecessorUpdatesMap = new Map<string, string[] | null>();
  remapUpdates.forEach(u => predecessorUpdatesMap.set(u.taskId, u.newPredecessors));
  cleanupUpdates.forEach(u => predecessorUpdatesMap.set(u.taskId, u.newPredecessors));
  
  return {
    tasksToDelete: [targetTask.id],
    hierarchyUpdates,
    predecessorUpdates: Array.from(predecessorUpdatesMap.entries()).map(
      ([taskId, newPredecessors]) => ({ taskId, newPredecessors })
    ),
    parentGroupsToRecalculate: [groupNumber]
  };
}

/**
 * Compute updates needed when deleting a group task (and all children)
 */
export function computeDeleteGroupUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): OperationResult {
  const groupNumber = parseInt(targetTask.hierarchy_number!);
  
  // Find all children to delete
  const childrenToDelete = allTasks.filter(task => 
    task.hierarchy_number?.startsWith(targetTask.hierarchy_number! + '.')
  );
  
  // Find groups that need renumbering
  const allToRenumber = allTasks.filter(task => {
    if (!task.hierarchy_number || task.id === targetTask.id) return false;
    const firstPart = parseInt(task.hierarchy_number.split('.')[0]);
    return firstPart > groupNumber;
  });
  
  // Sort ascending
  allToRenumber.sort((a, b) => 
    a.hierarchy_number!.localeCompare(b.hierarchy_number!, undefined, { numeric: true })
  );
  
  // Generate hierarchy updates
  const hierarchyUpdates: HierarchyUpdate[] = allToRenumber.map(task => {
    const parts = task.hierarchy_number!.split('.');
    const newGroupNumber = parseInt(parts[0]) - 1;
    const newHierarchy = parts.length === 1 
      ? `${newGroupNumber}`
      : `${newGroupNumber}.${parts.slice(1).join('.')}`;
    return { id: task.id, hierarchy_number: newHierarchy };
  });
  
  // Get all deleted hierarchy numbers
  const deletedHierarchyNumbers = [
    targetTask.hierarchy_number!,
    ...childrenToDelete.map(t => t.hierarchy_number!)
  ];
  
  // Build mapping
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  const cleanupUpdates = cleanupPredecessors(allTasks, deletedHierarchyNumbers);
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  const predecessorUpdatesMap = new Map<string, string[] | null>();
  remapUpdates.forEach(u => predecessorUpdatesMap.set(u.taskId, u.newPredecessors));
  cleanupUpdates.forEach(u => predecessorUpdatesMap.set(u.taskId, u.newPredecessors));
  
  return {
    tasksToDelete: [targetTask.id, ...childrenToDelete.map(t => t.id)],
    hierarchyUpdates,
    predecessorUpdates: Array.from(predecessorUpdatesMap.entries()).map(
      ([taskId, newPredecessors]) => ({ taskId, newPredecessors })
    ),
    parentGroupsToRecalculate: []
  };
}

/**
 * Main delete function - determines child vs group delete
 */
export function computeDeleteUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): OperationResult {
  if (!targetTask.hierarchy_number) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  return isGroupTask(targetTask)
    ? computeDeleteGroupUpdates(targetTask, allTasks)
    : computeDeleteChildUpdates(targetTask, allTasks);
}

/**
 * Compute updates for bulk delete
 */
export function computeBulkDeleteUpdates(
  selectedTaskIds: string[],
  allTasks: ProjectTask[]
): OperationResult {
  const selectedTasks = allTasks.filter(t => selectedTaskIds.includes(t.id));
  const selectedGroups = selectedTasks.filter(isGroupTask);
  const selectedChildren = selectedTasks.filter(t => !isGroupTask(t));
  
  // Children belonging to selected groups don't need separate processing
  const independentChildren = selectedChildren.filter(child => {
    const groupNumber = child.hierarchy_number?.split('.')[0];
    return !selectedGroups.some(g => g.hierarchy_number === groupNumber);
  });
  
  let allTasksToDelete: string[] = [...selectedTaskIds];
  let deletedHierarchyNumbers: string[] = [];
  
  // Add children of selected groups
  for (const group of selectedGroups) {
    const groupChildren = allTasks.filter(t => 
      t.hierarchy_number?.startsWith(group.hierarchy_number! + '.') && 
      !selectedTaskIds.includes(t.id)
    );
    allTasksToDelete.push(...groupChildren.map(t => t.id));
    deletedHierarchyNumbers.push(group.hierarchy_number!);
    deletedHierarchyNumbers.push(...groupChildren.map(t => t.hierarchy_number!));
  }
  
  deletedHierarchyNumbers.push(...independentChildren.map(t => t.hierarchy_number!));
  
  // Calculate hierarchy updates
  let hierarchyUpdates: HierarchyUpdate[] = [];
  let parentGroupsToRecalculate: string[] = [];
  
  // Handle independent children
  const childrenByGroup = new Map<string, ProjectTask[]>();
  for (const child of independentChildren) {
    const groupNumber = child.hierarchy_number!.split('.')[0];
    if (!childrenByGroup.has(groupNumber)) {
      childrenByGroup.set(groupNumber, []);
    }
    childrenByGroup.get(groupNumber)!.push(child);
    parentGroupsToRecalculate.push(groupNumber);
  }
  
  // Renumber remaining children in each affected group
  for (const [groupNumber, deletedChildren] of childrenByGroup.entries()) {
    const allChildrenInGroup = allTasks.filter(t => {
      const parts = t.hierarchy_number?.split('.');
      return parts?.length === 2 && parts[0] === groupNumber;
    });
    
    allChildrenInGroup.sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.')[1]);
      const bNum = parseInt(b.hierarchy_number!.split('.')[1]);
      return aNum - bNum;
    });
    
    const remainingChildren = allChildrenInGroup.filter(c => 
      !deletedChildren.some(d => d.id === c.id)
    );
    
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
    const groupsToRenumber = allTasks.filter(t => {
      if (!t.hierarchy_number || !isGroupTask(t)) return false;
      const groupNum = parseInt(t.hierarchy_number);
      return groupNum > minDeletedGroup && !deletedGroupNumbers.includes(groupNum);
    });
    
    groupsToRenumber.sort((a, b) => 
      parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!)
    );
    
    for (const group of groupsToRenumber) {
      const currentGroupNum = parseInt(group.hierarchy_number!);
      const deletedBefore = deletedGroupNumbers.filter(d => d < currentGroupNum).length;
      const newGroupNum = currentGroupNum - deletedBefore;
      
      hierarchyUpdates.push({ id: group.id, hierarchy_number: `${newGroupNum}` });
      
      const groupChildren = allTasks.filter(t => {
        const parts = t.hierarchy_number?.split('.');
        return parts?.length === 2 && parts[0] === currentGroupNum.toString();
      });
      
      for (const child of groupChildren) {
        const childNum = child.hierarchy_number!.split('.')[1];
        hierarchyUpdates.push({ id: child.id, hierarchy_number: `${newGroupNum}.${childNum}` });
      }
    }
  }
  
  // Build mapping and update predecessors
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  const cleanupUpdates = cleanupPredecessors(allTasks, deletedHierarchyNumbers);
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  const predecessorUpdatesMap = new Map<string, string[] | null>();
  remapUpdates.forEach(u => predecessorUpdatesMap.set(u.taskId, u.newPredecessors));
  cleanupUpdates.forEach(u => predecessorUpdatesMap.set(u.taskId, u.newPredecessors));
  
  return {
    tasksToDelete: allTasksToDelete,
    hierarchyUpdates,
    predecessorUpdates: Array.from(predecessorUpdatesMap.entries()).map(
      ([taskId, newPredecessors]) => ({ taskId, newPredecessors })
    ),
    parentGroupsToRecalculate
  };
}

// ==================== INDENT OPERATIONS ====================

/**
 * Check if task can be indented
 */
export function canIndent(task: ProjectTask, tasks: ProjectTask[]): boolean {
  if (!task.hierarchy_number) return false;
  
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  return currentIndex > 0;
}

/**
 * Generate new hierarchy for indented task
 */
export function generateIndentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  if (!task.hierarchy_number) return null;
  
  const sortedTasks = [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  if (currentIndex <= 0) return null;
  
  const previousTask = sortedTasks[currentIndex - 1];
  const parentHierarchy = previousTask.hierarchy_number;
  
  if (!parentHierarchy) return null;
  
  const isChildTask = parentHierarchy.includes('.');
  
  if (isChildTask) {
    const parentParts = parentHierarchy.split('.');
    const immediateParent = parentParts.slice(0, -1).join('.');
    
    const existingChildren = tasks.filter(t => 
      t.hierarchy_number?.startsWith(immediateParent + ".") &&
      t.hierarchy_number.split(".").length === parentParts.length
    );
    
    return `${immediateParent}.${existingChildren.length + 1}`;
  } else {
    const existingChildren = tasks.filter(t => 
      t.hierarchy_number?.startsWith(parentHierarchy + ".") &&
      t.hierarchy_number.split(".").length === parentHierarchy.split(".").length + 1
    );
    
    return `${parentHierarchy}.${existingChildren.length + 1}`;
  }
}

/**
 * Generate all updates for indenting a task
 */
export function generateIndentUpdates(
  task: ProjectTask,
  tasks: ProjectTask[]
): HierarchyUpdate[] {
  if (!task.hierarchy_number) return [];
  
  const originalNumber = parseInt(task.hierarchy_number.split('.')[0]);
  const newHierarchy = generateIndentHierarchy(task, tasks);
  
  if (!newHierarchy) return [];
  
  // Check for duplicate
  if (tasks.some(t => t.id !== task.id && t.hierarchy_number === newHierarchy)) {
    return [];
  }
  
  const updates: HierarchyUpdate[] = [{ id: task.id, hierarchy_number: newHierarchy }];
  
  // Renumber subsequent top-level tasks
  const tasksToRenumber = tasks.filter(t => {
    if (!t.hierarchy_number || t.id === task.id) return false;
    if (t.hierarchy_number.includes('.')) return false;
    return parseInt(t.hierarchy_number) > originalNumber;
  }).sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  tasksToRenumber.forEach(t => {
    const newNumber = parseInt(t.hierarchy_number!) - 1;
    if (newNumber > 0) {
      updates.push({ id: t.id, hierarchy_number: newNumber.toString() });
    }
  });
  
  return updates;
}

// ==================== OUTDENT OPERATIONS ====================

/**
 * Check if task can be outdented
 */
export function canOutdent(task: ProjectTask): boolean {
  if (!task.hierarchy_number || !task.hierarchy_number.includes('.')) return false;
  return task.hierarchy_number.split('.').length === 2;
}

/**
 * Compute all updates for outdenting a task
 */
export function computeOutdentUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): OperationResult {
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const predecessorUpdates: PredecessorUpdate[] = [];
  
  if (!targetTask.hierarchy_number || !targetTask.hierarchy_number.includes('.')) {
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const hierarchyParts = targetTask.hierarchy_number.split('.');
  if (hierarchyParts.length !== 2) {
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const parentHierarchy = hierarchyParts[0];
  const childNumber = parseInt(hierarchyParts[1]);
  
  // Get current groups
  const currentGroups = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const newGroupNumber = parseInt(parentHierarchy) + 1;
  
  // Convert target to group
  hierarchyUpdates.push({ id: targetTask.id, hierarchy_number: newGroupNumber.toString() });
  
  // Shift groups after insertion point
  const groupsToShift = currentGroups.filter(g => parseInt(g.hierarchy_number!) >= newGroupNumber);
  
  groupsToShift.forEach(group => {
    const oldNumber = parseInt(group.hierarchy_number!);
    const newNumber = oldNumber + 1;
    
    hierarchyUpdates.push({ id: group.id, hierarchy_number: newNumber.toString() });
    
    // Update children of shifted groups
    allTasks
      .filter(t => t.hierarchy_number?.startsWith(group.hierarchy_number! + '.') &&
                   t.hierarchy_number.split('.').length === 2)
      .forEach(child => {
        const childParts = child.hierarchy_number!.split('.');
        hierarchyUpdates.push({ id: child.id, hierarchy_number: `${newNumber}.${childParts[1]}` });
      });
  });
  
  // Renumber remaining children in parent group
  const parentChildren = allTasks
    .filter(t => t.hierarchy_number?.startsWith(parentHierarchy + '.') &&
                 t.hierarchy_number.split('.').length === 2 &&
                 t.id !== targetTask.id)
    .sort((a, b) => parseInt(a.hierarchy_number!.split('.')[1]) - parseInt(b.hierarchy_number!.split('.')[1]));
  
  parentChildren
    .filter(c => parseInt(c.hierarchy_number!.split('.')[1]) > childNumber)
    .forEach(child => {
      const oldChildNumber = parseInt(child.hierarchy_number!.split('.')[1]);
      hierarchyUpdates.push({ id: child.id, hierarchy_number: `${parentHierarchy}.${oldChildNumber - 1}` });
    });
  
  // Remap predecessors
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  const remapUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  return { hierarchyUpdates, predecessorUpdates: remapUpdates };
}

// ==================== DRAG-DROP OPERATIONS ====================

/**
 * Check if a drop is valid
 */
export function canDropAt(
  draggedTask: ProjectTask,
  targetTask: ProjectTask
): boolean {
  if (!draggedTask.hierarchy_number || !targetTask.hierarchy_number) return false;
  if (draggedTask.id === targetTask.id) return false;
  if (targetTask.hierarchy_number.startsWith(draggedTask.hierarchy_number + '.')) return false;
  
  const draggedParts = draggedTask.hierarchy_number.split('.');
  const targetParts = targetTask.hierarchy_number.split('.');
  
  // Same depth level
  if (draggedParts.length !== targetParts.length) return false;
  
  // Same parent (if not top-level)
  if (draggedParts.length > 1) {
    const draggedParent = draggedParts.slice(0, -1).join('.');
    const targetParent = targetParts.slice(0, -1).join('.');
    if (draggedParent !== targetParent) return false;
  }
  
  return true;
}

/**
 * Compute drag-drop updates
 */
export function computeDragDropUpdates(
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): OperationResult {
  if (!draggedTask.hierarchy_number || !targetTask.hierarchy_number) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  const isTopLevel = !draggedTask.hierarchy_number.includes('.');
  
  return isTopLevel
    ? computeTopLevelDragDrop(draggedTask, targetTask, dropPosition, allTasks)
    : computeChildDragDrop(draggedTask, targetTask, dropPosition, allTasks);
}

function computeTopLevelDragDrop(
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): OperationResult {
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const predecessorUpdates: PredecessorUpdate[] = [];
  
  const topLevelTasks = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const draggedIndex = topLevelTasks.findIndex(t => t.id === draggedTask.id);
  let targetIndex = topLevelTasks.findIndex(t => t.id === targetTask.id);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  if (dropPosition === 'after') targetIndex += 1;
  if (targetIndex > draggedIndex) targetIndex -= 1;
  if (targetIndex === draggedIndex) {
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const oldToNewHierarchy = new Map<string, string>();
  
  const reorderedTasks = [...topLevelTasks];
  const [removed] = reorderedTasks.splice(draggedIndex, 1);
  reorderedTasks.splice(targetIndex, 0, removed);
  
  reorderedTasks.forEach((task, index) => {
    const oldHierarchy = task.hierarchy_number!;
    const newHierarchy = (index + 1).toString();
    
    if (oldHierarchy !== newHierarchy) {
      oldToNewHierarchy.set(oldHierarchy, newHierarchy);
      hierarchyUpdates.push({ id: task.id, hierarchy_number: newHierarchy });
      
      // Update children
      allTasks
        .filter(t => t.hierarchy_number?.startsWith(oldHierarchy + '.'))
        .forEach(child => {
          const newChildHierarchy = child.hierarchy_number!.replace(oldHierarchy, newHierarchy);
          oldToNewHierarchy.set(child.hierarchy_number!, newChildHierarchy);
          hierarchyUpdates.push({ id: child.id, hierarchy_number: newChildHierarchy });
        });
    }
  });
  
  // Update predecessors
  const remapUpdates = remapPredecessors(allTasks, oldToNewHierarchy);
  
  return { hierarchyUpdates, predecessorUpdates: remapUpdates };
}

function computeChildDragDrop(
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): OperationResult {
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const predecessorUpdates: PredecessorUpdate[] = [];
  
  const draggedParts = draggedTask.hierarchy_number!.split('.');
  const parentHierarchy = draggedParts.slice(0, -1).join('.');
  
  const siblings = allTasks
    .filter(t => {
      if (!t.hierarchy_number) return false;
      const parts = t.hierarchy_number.split('.');
      if (parts.length !== draggedParts.length) return false;
      if (parts.length === 1) return true;
      return parts.slice(0, -1).join('.') === parentHierarchy;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.').pop()!);
      const bNum = parseInt(b.hierarchy_number!.split('.').pop()!);
      return aNum - bNum;
    });
  
  const draggedIndex = siblings.findIndex(t => t.id === draggedTask.id);
  let targetIndex = siblings.findIndex(t => t.id === targetTask.id);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  if (dropPosition === 'after') targetIndex += 1;
  if (targetIndex > draggedIndex) targetIndex -= 1;
  if (targetIndex === draggedIndex) {
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const oldToNewHierarchy = new Map<string, string>();
  
  const reorderedTasks = [...siblings];
  const [removed] = reorderedTasks.splice(draggedIndex, 1);
  reorderedTasks.splice(targetIndex, 0, removed);
  
  reorderedTasks.forEach((task, index) => {
    const oldHierarchy = task.hierarchy_number!;
    const newHierarchy = parentHierarchy ? `${parentHierarchy}.${index + 1}` : (index + 1).toString();
    
    if (oldHierarchy !== newHierarchy) {
      oldToNewHierarchy.set(oldHierarchy, newHierarchy);
      hierarchyUpdates.push({ id: task.id, hierarchy_number: newHierarchy });
    }
  });
  
  const remapUpdates = remapPredecessors(allTasks, oldToNewHierarchy);
  
  return { hierarchyUpdates, predecessorUpdates: remapUpdates };
}

// ==================== NORMALIZATION ====================

/**
 * Check if hierarchy normalization is needed
 */
export function needsNormalization(allTasks: ProjectTask[]): boolean {
  if (allTasks.length === 0) return false;
  
  const topLevelTasks = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => a.hierarchy_number!.localeCompare(b.hierarchy_number!, undefined, { numeric: true }));
  
  // Check if first top-level task is 1
  if (topLevelTasks.length > 0 && topLevelTasks[0].hierarchy_number !== '1') {
    return true;
  }
  
  // Check for gaps
  const topLevelNumbers = new Set<number>();
  const childNumbersByGroup = new Map<string, Set<number>>();
  
  for (const task of allTasks) {
    if (!task.hierarchy_number) continue;
    
    const parts = task.hierarchy_number.split('.');
    if (parts.length === 1) {
      topLevelNumbers.add(parseInt(parts[0]));
    } else if (parts.length === 2) {
      const groupNumber = parts[0];
      if (!childNumbersByGroup.has(groupNumber)) {
        childNumbersByGroup.set(groupNumber, new Set());
      }
      childNumbersByGroup.get(groupNumber)!.add(parseInt(parts[1]));
    }
  }
  
  // Check top-level gaps
  const maxTopLevel = Math.max(...Array.from(topLevelNumbers));
  for (let i = 1; i <= maxTopLevel; i++) {
    if (!topLevelNumbers.has(i)) return true;
  }
  
  // Check child gaps
  for (const [, childNumbers] of childNumbersByGroup.entries()) {
    const maxChild = Math.max(...Array.from(childNumbers));
    for (let i = 1; i <= maxChild; i++) {
      if (!childNumbers.has(i)) return true;
    }
  }
  
  return false;
}

/**
 * Compute normalization updates
 */
export function computeNormalizationUpdates(allTasks: ProjectTask[]): OperationResult {
  const sortedTasks = [...allTasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
  
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();
  
  // Renumber top-level tasks
  const topLevelTasks = sortedTasks.filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'));
  const parentMapping = new Map<string, string>();
  
  topLevelTasks.forEach((task, index) => {
    const newNumber = (index + 1).toString();
    if (task.hierarchy_number !== newNumber) {
      parentMapping.set(task.hierarchy_number!, newNumber);
      hierarchyMapping.set(task.hierarchy_number!, newNumber);
      hierarchyUpdates.push({ id: task.id, hierarchy_number: newNumber });
    }
  });
  
  // Update children based on parent mapping
  for (const [oldParent, newParent] of parentMapping.entries()) {
    const children = sortedTasks.filter(t => t.hierarchy_number?.startsWith(oldParent + '.'));
    
    children.sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.')[1]);
      const bNum = parseInt(b.hierarchy_number!.split('.')[1]);
      return aNum - bNum;
    });
    
    children.forEach((child, index) => {
      const newHierarchy = `${newParent}.${index + 1}`;
      if (child.hierarchy_number !== newHierarchy) {
        hierarchyMapping.set(child.hierarchy_number!, newHierarchy);
        hierarchyUpdates.push({ id: child.id, hierarchy_number: newHierarchy });
      }
    });
  }
  
  const predecessorUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  return { hierarchyUpdates, predecessorUpdates };
}

// ==================== HELPER EXPORTS ====================

export function getDescendantIds(task: ProjectTask, allTasks: ProjectTask[]): string[] {
  if (!task.hierarchy_number) return [];
  
  return allTasks
    .filter(t => t.hierarchy_number?.startsWith(task.hierarchy_number + '.'))
    .map(t => t.id);
}
