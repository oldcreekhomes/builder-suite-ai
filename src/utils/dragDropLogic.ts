import { ProjectTask } from "@/hooks/useProjectTasks";

export interface DragDropResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>;
}

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
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  const predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }> = [];
  
  if (!draggedTask.hierarchy_number || !targetTask.hierarchy_number) {
    return { hierarchyUpdates, predecessorUpdates };
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
  const predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }> = [];
  
  // Get all top-level groups sorted
  const topLevelTasks = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const draggedIndex = topLevelTasks.findIndex(t => t.id === draggedTask.id);
  let targetIndex = topLevelTasks.findIndex(t => t.id === targetTask.id);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return { hierarchyUpdates, predecessorUpdates };
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
    return { hierarchyUpdates, predecessorUpdates };
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
  
  // Predecessors are NOT updated during drag-drop - they stay as-is
  // This matches competitor software behavior where only task numbers change
  // and users can see/fix any resulting dependency issues in the Gantt chart
  
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
  const predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }> = [];
  
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
    return { hierarchyUpdates, predecessorUpdates };
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
    return { hierarchyUpdates, predecessorUpdates };
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
  
  // Predecessors are NOT updated during drag-drop - they stay as-is
  // This matches competitor software behavior where only task numbers change
  // and users can see/fix any resulting dependency issues in the Gantt chart
  
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
