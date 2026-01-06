import { ProjectTask } from "@/hooks/useProjectTasks";

export interface DragDropResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ id: string; predecessor: string[] | null }>;
}

/**
 * Remap a single predecessor string using the hierarchy mapping
 * Handles formats: "9.2", "9.2SS", "9.2SS+5d", "9.2FS-3d"
 */
const remapPredecessorString = (
  predecessor: string,
  oldToNewHierarchy: Map<string, string>
): string => {
  // Pattern: hierarchy number, optional link type (SS/FS/FF/SF), optional lag (+/-Xd)
  const match = predecessor.match(/^(\d+(?:\.\d+)*)(SS|FS|FF|SF)?([+-]\d+d)?$/i);
  
  if (!match) {
    // Doesn't match expected format, return as-is
    return predecessor;
  }
  
  const [, hierarchyNum, linkType = '', lag = ''] = match;
  const newHierarchy = oldToNewHierarchy.get(hierarchyNum);
  
  if (newHierarchy) {
    return `${newHierarchy}${linkType}${lag}`;
  }
  
  return predecessor;
};

/**
 * Remap all predecessors in the project using the old-to-new hierarchy mapping
 */
const remapPredecessors = (
  allTasks: ProjectTask[],
  oldToNewHierarchy: Map<string, string>
): Array<{ id: string; predecessor: string[] | null }> => {
  const updates: Array<{ id: string; predecessor: string[] | null }> = [];
  
  // Skip if no mappings
  if (oldToNewHierarchy.size === 0) {
    return updates;
  }
  
  for (const task of allTasks) {
    // Handle both string and string[] predecessor formats
    const predecessors = task.predecessor;
    if (!predecessors || (Array.isArray(predecessors) && predecessors.length === 0)) {
      continue;
    }
    
    const predArray = Array.isArray(predecessors) ? predecessors : [predecessors];
    
    let hasChanges = false;
    const newPredecessors = predArray.map(pred => {
      const remapped = remapPredecessorString(pred, oldToNewHierarchy);
      if (remapped !== pred) {
        hasChanges = true;
      }
      return remapped;
    });
    
    if (hasChanges) {
      updates.push({
        id: task.id,
        predecessor: newPredecessors
      });
    }
  }
  
  return updates;
};

/**
 * Check if a drop is valid (same parent level, not onto self or children)
 */
export const canDropAt = (
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): boolean => {
  if (!draggedTask.hierarchy_number || !targetTask.hierarchy_number) return false;
  
  // Cannot drop on self
  if (draggedTask.id === targetTask.id) return false;
  
  // Cannot drop onto own children
  if (targetTask.hierarchy_number.startsWith(draggedTask.hierarchy_number + '.')) return false;
  
  // Must be same parent level (siblings only for phase 1)
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
};

/**
 * Compute all updates needed to move a task to a new position
 */
export const computeDragDropUpdates = (
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): DragDropResult => {
  if (!draggedTask.hierarchy_number || !targetTask.hierarchy_number) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  const isTopLevel = !draggedTask.hierarchy_number.includes('.');
  
  if (isTopLevel) {
    return computeTopLevelDragDrop(draggedTask, targetTask, dropPosition, allTasks);
  } else {
    return computeChildDragDrop(draggedTask, targetTask, dropPosition, allTasks);
  }
};

/**
 * Handle drag-drop for top-level groups (e.g., "1", "2", "3")
 */
const computeTopLevelDragDrop = (
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): DragDropResult => {
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  
  // Get all top-level groups sorted
  const topLevelTasks = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const draggedIndex = topLevelTasks.findIndex(t => t.id === draggedTask.id);
  let targetIndex = topLevelTasks.findIndex(t => t.id === targetTask.id);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  // Adjust target index based on drop position
  if (dropPosition === 'after') {
    targetIndex += 1;
  }
  
  // If dropping after dragged item's original position, adjust for removal
  if (targetIndex > draggedIndex) {
    targetIndex -= 1;
  }
  
  // If no actual movement needed
  if (targetIndex === draggedIndex) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  // Build old-to-new hierarchy mapping
  const oldToNewHierarchy = new Map<string, string>();
  
  // Remove dragged task from array and insert at new position
  const reorderedTasks = [...topLevelTasks];
  const [removed] = reorderedTasks.splice(draggedIndex, 1);
  reorderedTasks.splice(targetIndex, 0, removed);
  
  // Assign new hierarchy numbers (1, 2, 3, ...)
  reorderedTasks.forEach((task, index) => {
    const oldHierarchy = task.hierarchy_number!;
    const newHierarchy = (index + 1).toString();
    
    if (oldHierarchy !== newHierarchy) {
      oldToNewHierarchy.set(oldHierarchy, newHierarchy);
      hierarchyUpdates.push({ id: task.id, hierarchy_number: newHierarchy });
      
      // Update all children of this group
      allTasks
        .filter(t => t.hierarchy_number && t.hierarchy_number.startsWith(oldHierarchy + '.'))
        .forEach(child => {
          const newChildHierarchy = child.hierarchy_number!.replace(oldHierarchy, newHierarchy);
          oldToNewHierarchy.set(child.hierarchy_number!, newChildHierarchy);
          hierarchyUpdates.push({ id: child.id, hierarchy_number: newChildHierarchy });
        });
    }
  });
  
  // Remap all predecessors using the hierarchy mapping
  const predecessorUpdates = remapPredecessors(allTasks, oldToNewHierarchy);
  
  return { hierarchyUpdates, predecessorUpdates };
};

/**
 * Handle drag-drop for child tasks (e.g., "1.1", "1.2", "2.3")
 */
const computeChildDragDrop = (
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): DragDropResult => {
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  
  const draggedParts = draggedTask.hierarchy_number!.split('.');
  const parentHierarchy = draggedParts.slice(0, -1).join('.');
  
  // Get all siblings (children at same level under same parent)
  const siblings = allTasks
    .filter(t => {
      if (!t.hierarchy_number) return false;
      const parts = t.hierarchy_number.split('.');
      if (parts.length !== draggedParts.length) return false;
      if (parts.length === 1) return true; // Top level
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
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  // Adjust target index based on drop position
  if (dropPosition === 'after') {
    targetIndex += 1;
  }
  
  // If dropping after dragged item's original position, adjust for removal
  if (targetIndex > draggedIndex) {
    targetIndex -= 1;
  }
  
  // If no actual movement needed
  if (targetIndex === draggedIndex) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  // Build old-to-new hierarchy mapping
  const oldToNewHierarchy = new Map<string, string>();
  
  // Remove dragged task from array and insert at new position
  const reorderedTasks = [...siblings];
  const [removed] = reorderedTasks.splice(draggedIndex, 1);
  reorderedTasks.splice(targetIndex, 0, removed);
  
  // Assign new hierarchy numbers
  reorderedTasks.forEach((task, index) => {
    const oldHierarchy = task.hierarchy_number!;
    const newHierarchy = parentHierarchy 
      ? `${parentHierarchy}.${index + 1}`
      : (index + 1).toString();
    
    if (oldHierarchy !== newHierarchy) {
      oldToNewHierarchy.set(oldHierarchy, newHierarchy);
      hierarchyUpdates.push({ id: task.id, hierarchy_number: newHierarchy });
    }
  });
  
  // Remap all predecessors using the hierarchy mapping
  const predecessorUpdates = remapPredecessors(allTasks, oldToNewHierarchy);
  
  return { hierarchyUpdates, predecessorUpdates };
};

/**
 * Get all descendants of a task (for styling during drag)
 */
export const getDescendantIds = (task: ProjectTask, allTasks: ProjectTask[]): string[] => {
  if (!task.hierarchy_number) return [];
  
  return allTasks
    .filter(t => t.hierarchy_number && t.hierarchy_number.startsWith(task.hierarchy_number + '.'))
    .map(t => t.id);
};
