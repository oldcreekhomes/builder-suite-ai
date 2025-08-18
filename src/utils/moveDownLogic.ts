import { ProjectTask } from "@/hooks/useProjectTasks";

interface MoveDownResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>;
}

export const computeMoveDownUpdates = (targetTask: ProjectTask, allTasks: ProjectTask[]): MoveDownResult => {
  console.log('🔄 Computing move down updates for task:', targetTask.task_name, 'hierarchy:', targetTask.hierarchy_number);
  
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  const predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }> = [];
  
  if (!targetTask.hierarchy_number) {
    console.log('❌ Task has no hierarchy number, cannot move down');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const isGroup = !targetTask.hierarchy_number.includes('.');
  
  if (isGroup) {
    return computeGroupMoveDown(targetTask, allTasks, hierarchyUpdates, predecessorUpdates);
  } else {
    return computeChildMoveDown(targetTask, allTasks, hierarchyUpdates, predecessorUpdates);
  }
};

const computeGroupMoveDown = (
  targetTask: ProjectTask, 
  allTasks: ProjectTask[], 
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>,
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>
): MoveDownResult => {
  // Get all top-level groups sorted by hierarchy
  const groups = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const currentGroupIndex = groups.findIndex(g => g.id === targetTask.id);
  
  // Check if there's a next group to swap with
  if (currentGroupIndex === -1 || currentGroupIndex >= groups.length - 1) {
    console.log('❌ Cannot move group down - no group below');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const currentGroup = groups[currentGroupIndex];
  const nextGroup = groups[currentGroupIndex + 1];
  
  console.log(`📊 Swapping groups: ${currentGroup.hierarchy_number} ↔ ${nextGroup.hierarchy_number}`);
  
  // Get all children of both groups
  const currentGroupChildren = allTasks.filter(t => 
    t.hierarchy_number && 
    t.hierarchy_number.startsWith(currentGroup.hierarchy_number! + '.')
  );
  
  const nextGroupChildren = allTasks.filter(t => 
    t.hierarchy_number && 
    t.hierarchy_number.startsWith(nextGroup.hierarchy_number! + '.')
  );
  
  // Swap the group hierarchy numbers
  hierarchyUpdates.push({ id: currentGroup.id, hierarchy_number: nextGroup.hierarchy_number! });
  hierarchyUpdates.push({ id: nextGroup.id, hierarchy_number: currentGroup.hierarchy_number! });
  
  // Update all children hierarchy numbers
  currentGroupChildren.forEach(child => {
    const newHierarchy = child.hierarchy_number!.replace(
      currentGroup.hierarchy_number!,
      nextGroup.hierarchy_number!
    );
    hierarchyUpdates.push({ id: child.id, hierarchy_number: newHierarchy });
  });
  
  nextGroupChildren.forEach(child => {
    const newHierarchy = child.hierarchy_number!.replace(
      nextGroup.hierarchy_number!,
      currentGroup.hierarchy_number!
    );
    hierarchyUpdates.push({ id: child.id, hierarchy_number: newHierarchy });
  });
  
  // Update predecessors that reference the swapped groups
  allTasks.forEach(task => {
    if (task.predecessor) {
      const predecessors = Array.isArray(task.predecessor) 
        ? task.predecessor 
        : (typeof task.predecessor === 'string' ? [task.predecessor] : []);
      
      let updated = false;
      const newPredecessors = predecessors.map(pred => {
        if (pred === currentGroup.hierarchy_number) {
          updated = true;
          return nextGroup.hierarchy_number!;
        } else if (pred === nextGroup.hierarchy_number) {
          updated = true;
          return currentGroup.hierarchy_number!;
        }
        return pred;
      });
      
      if (updated) {
        predecessorUpdates.push({
          taskId: task.id,
          newPredecessors
        });
      }
    }
  });
  
  return { hierarchyUpdates, predecessorUpdates };
};

const computeChildMoveDown = (
  targetTask: ProjectTask, 
  allTasks: ProjectTask[], 
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>,
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>
): MoveDownResult => {
  const hierarchyParts = targetTask.hierarchy_number!.split('.');
  const parentHierarchy = hierarchyParts[0];
  const currentChildNumber = parseInt(hierarchyParts[1]);
  
  // Get all children in the same group
  const siblingChildren = allTasks
    .filter(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(parentHierarchy + '.') &&
      t.hierarchy_number.split('.').length === 2
    )
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.')[1]);
      const bNum = parseInt(b.hierarchy_number!.split('.')[1]);
      return aNum - bNum;
    });
  
  const currentIndex = siblingChildren.findIndex(child => child.id === targetTask.id);
  
  // Check if there's a next sibling to swap with
  if (currentIndex === -1 || currentIndex >= siblingChildren.length - 1) {
    console.log('❌ Cannot move child down - no sibling below or at group boundary');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const nextChild = siblingChildren[currentIndex + 1];
  const nextChildNumber = parseInt(nextChild.hierarchy_number!.split('.')[1]);
  
  console.log(`📊 Swapping children: ${parentHierarchy}.${currentChildNumber} ↔ ${parentHierarchy}.${nextChildNumber}`);
  
  // Swap the child numbers
  hierarchyUpdates.push({ 
    id: targetTask.id, 
    hierarchy_number: `${parentHierarchy}.${nextChildNumber}` 
  });
  hierarchyUpdates.push({ 
    id: nextChild.id, 
    hierarchy_number: `${parentHierarchy}.${currentChildNumber}` 
  });
  
  // Update predecessors that reference the swapped children
  allTasks.forEach(task => {
    if (task.predecessor) {
      const predecessors = Array.isArray(task.predecessor) 
        ? task.predecessor 
        : (typeof task.predecessor === 'string' ? [task.predecessor] : []);
      
      let updated = false;
      const newPredecessors = predecessors.map(pred => {
        if (pred === targetTask.hierarchy_number) {
          updated = true;
          return `${parentHierarchy}.${nextChildNumber}`;
        } else if (pred === nextChild.hierarchy_number) {
          updated = true;
          return `${parentHierarchy}.${currentChildNumber}`;
        }
        return pred;
      });
      
      if (updated) {
        predecessorUpdates.push({
          taskId: task.id,
          newPredecessors
        });
      }
    }
  });
  
  return { hierarchyUpdates, predecessorUpdates };
};

export const canMoveDown = (targetTask: ProjectTask, allTasks: ProjectTask[]): boolean => {
  if (!targetTask.hierarchy_number) {
    return false;
  }
  
  const isGroup = !targetTask.hierarchy_number.includes('.');
  
  if (isGroup) {
    // For groups: check if there's another group below
    const groups = allTasks
      .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
      .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
    
    const currentGroupIndex = groups.findIndex(g => g.id === targetTask.id);
    return currentGroupIndex !== -1 && currentGroupIndex < groups.length - 1;
  } else {
    // For children: check if there's a next sibling in the same group
    const hierarchyParts = targetTask.hierarchy_number.split('.');
    const parentHierarchy = hierarchyParts[0];
    
    const siblingChildren = allTasks
      .filter(t => 
        t.hierarchy_number && 
        t.hierarchy_number.startsWith(parentHierarchy + '.') &&
        t.hierarchy_number.split('.').length === 2
      )
      .sort((a, b) => {
        const aNum = parseInt(a.hierarchy_number!.split('.')[1]);
        const bNum = parseInt(b.hierarchy_number!.split('.')[1]);
        return aNum - bNum;
      });
    
    const currentIndex = siblingChildren.findIndex(child => child.id === targetTask.id);
    return currentIndex !== -1 && currentIndex < siblingChildren.length - 1;
  }
};