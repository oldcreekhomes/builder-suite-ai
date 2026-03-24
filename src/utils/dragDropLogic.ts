import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors } from "./predecessorRemapping";

export interface DragDropResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ id: string; predecessor: string[] | null }>;
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
  if (draggedTask.id === targetTask.id) return false;
  if (targetTask.hierarchy_number.startsWith(draggedTask.hierarchy_number + '.')) return false;
  
  const draggedParts = draggedTask.hierarchy_number.split('.');
  const targetParts = targetTask.hierarchy_number.split('.');
  
  if (draggedParts.length !== targetParts.length) return false;
  
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
  return isTopLevel
    ? computeTopLevelDragDrop(draggedTask, targetTask, dropPosition, allTasks)
    : computeChildDragDrop(draggedTask, targetTask, dropPosition, allTasks);
};

function computeTopLevelDragDrop(
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): DragDropResult {
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  
  const topLevelTasks = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const draggedIndex = topLevelTasks.findIndex(t => t.id === draggedTask.id);
  let targetIndex = topLevelTasks.findIndex(t => t.id === targetTask.id);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  if (dropPosition === 'after') targetIndex += 1;
  if (targetIndex > draggedIndex) targetIndex -= 1;
  if (targetIndex === draggedIndex) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
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
      
      // Update all children of this group
      allTasks
        .filter(t => t.hierarchy_number?.startsWith(oldHierarchy + '.'))
        .forEach(child => {
          const newChildHierarchy = child.hierarchy_number!.replace(oldHierarchy, newHierarchy);
          oldToNewHierarchy.set(child.hierarchy_number!, newChildHierarchy);
          hierarchyUpdates.push({ id: child.id, hierarchy_number: newChildHierarchy });
        });
    }
  });
  
  // Use unified predecessor remapping
  const rawUpdates = remapAllPredecessors(allTasks, oldToNewHierarchy);
  const predecessorUpdates = rawUpdates.map(u => ({
    id: u.taskId,
    predecessor: u.newPredecessors.length > 0 ? u.newPredecessors : null
  }));
  
  return { hierarchyUpdates, predecessorUpdates };
}

function computeChildDragDrop(
  draggedTask: ProjectTask,
  targetTask: ProjectTask,
  dropPosition: 'before' | 'after',
  allTasks: ProjectTask[]
): DragDropResult {
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  
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
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  if (dropPosition === 'after') targetIndex += 1;
  if (targetIndex > draggedIndex) targetIndex -= 1;
  if (targetIndex === draggedIndex) {
    return { hierarchyUpdates: [], predecessorUpdates: [] };
  }
  
  const oldToNewHierarchy = new Map<string, string>();
  
  const reorderedTasks = [...siblings];
  const [removed] = reorderedTasks.splice(draggedIndex, 1);
  reorderedTasks.splice(targetIndex, 0, removed);
  
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
  
  // Use unified predecessor remapping
  const rawUpdates = remapAllPredecessors(allTasks, oldToNewHierarchy);
  const predecessorUpdates = rawUpdates.map(u => ({
    id: u.taskId,
    predecessor: u.newPredecessors.length > 0 ? u.newPredecessors : null
  }));
  
  return { hierarchyUpdates, predecessorUpdates };
}

/**
 * Get all descendants of a task (for styling during drag)
 */
export const getDescendantIds = (task: ProjectTask, allTasks: ProjectTask[]): string[] => {
  if (!task.hierarchy_number) return [];
  return allTasks
    .filter(t => t.hierarchy_number?.startsWith(task.hierarchy_number + '.'))
    .map(t => t.id);
};
