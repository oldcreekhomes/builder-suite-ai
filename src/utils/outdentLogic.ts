import { ProjectTask } from "@/hooks/useProjectTasks";

interface OutdentResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>;
}

export const computeOutdentUpdates = (targetTask: ProjectTask, allTasks: ProjectTask[]): OutdentResult => {
  console.log('🔄 Computing outdent updates for task:', targetTask.task_name, 'hierarchy:', targetTask.hierarchy_number);
  
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  const predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }> = [];
  
  if (!targetTask.hierarchy_number) {
    console.log('❌ Task has no hierarchy number, cannot outdent');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  // Only children can be outdented (tasks with dots in hierarchy)
  if (!targetTask.hierarchy_number.includes('.')) {
    console.log('❌ Task is already a top-level group, cannot outdent');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  // Get the target task's current hierarchy level
  const hierarchyParts = targetTask.hierarchy_number.split('.');
  const currentLevel = hierarchyParts.length;
  
  // Only support outdenting from level 2 to level 1 (child to group)
  if (currentLevel !== 2) {
    console.log('❌ Can only outdent level 2 tasks (children) to level 1 (groups)');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  // Parse current hierarchy: "1.2" -> parent="1", childNumber=2
  const parentHierarchy = hierarchyParts[0];
  const childNumber = parseInt(hierarchyParts[1]);
  
  console.log(`📊 Target task ${targetTask.task_name}: parent=${parentHierarchy}, child=${childNumber}`);
  
  // Step 1: Find where to insert the new group
  // Get all current groups (top-level tasks)
  const currentGroups = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  // Find the parent group
  const parentGroup = currentGroups.find(t => t.hierarchy_number === parentHierarchy);
  if (!parentGroup) {
    console.log('❌ Parent group not found');
    return { hierarchyUpdates, predecessorUpdates };
  }
  
  const parentGroupIndex = currentGroups.findIndex(t => t.hierarchy_number === parentHierarchy);
  const insertAtIndex = parentGroupIndex + 1; // Insert right after parent
  const newGroupNumber = parseInt(parentHierarchy) + 1;
  
  console.log(`📊 Will insert new group ${newGroupNumber} after parent group ${parentHierarchy}`);
  
  // Step 2: Convert target task to a group
  hierarchyUpdates.push({
    id: targetTask.id,
    hierarchy_number: newGroupNumber.toString()
  });
  
  console.log(`✅ Convert task ${targetTask.task_name} from ${targetTask.hierarchy_number} to ${newGroupNumber}`);
  
  // Step 3: Shift all groups that come after the insertion point
  const groupsToShift = currentGroups.slice(insertAtIndex);
  groupsToShift.forEach(group => {
    const oldNumber = parseInt(group.hierarchy_number!);
    const newNumber = oldNumber + 1;
    
    hierarchyUpdates.push({
      id: group.id,
      hierarchy_number: newNumber.toString()
    });
    
    console.log(`🔄 Shift group ${group.task_name} from ${oldNumber} to ${newNumber}`);
    
    // Step 4: Update all children of shifted groups
    const groupChildren = allTasks.filter(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(group.hierarchy_number! + '.') &&
      t.hierarchy_number.split('.').length === 2
    );
    
    groupChildren.forEach(child => {
      const childParts = child.hierarchy_number!.split('.');
      const newChildHierarchy = `${newNumber}.${childParts[1]}`;
      
      hierarchyUpdates.push({
        id: child.id,
        hierarchy_number: newChildHierarchy
      });
      
      console.log(`🔄 Update child ${child.task_name} from ${child.hierarchy_number} to ${newChildHierarchy}`);
    });
  });
  
  // Step 5: Update remaining children of the parent group
  // Get all children of the parent group that come after the target task
  const parentChildren = allTasks
    .filter(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(parentHierarchy + '.') &&
      t.hierarchy_number.split('.').length === 2 &&
      t.id !== targetTask.id
    )
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.')[1]);
      const bNum = parseInt(b.hierarchy_number!.split('.')[1]);
      return aNum - bNum;
    });
  
  // Renumber children that come after the target task
  const childrenToRenumber = parentChildren.filter(child => {
    const childNum = parseInt(child.hierarchy_number!.split('.')[1]);
    return childNum > childNumber;
  });
  
  childrenToRenumber.forEach(child => {
    const childParts = child.hierarchy_number!.split('.');
    const oldChildNumber = parseInt(childParts[1]);
    const newChildNumber = oldChildNumber - 1; // Move up by 1
    const newChildHierarchy = `${parentHierarchy}.${newChildNumber}`;
    
    hierarchyUpdates.push({
      id: child.id,
      hierarchy_number: newChildHierarchy
    });
    
    console.log(`🔄 Renumber child ${child.task_name} from ${child.hierarchy_number} to ${newChildHierarchy}`);
  });
  
  // Step 6: Remap predecessors
  // Create a mapping of old hierarchy numbers to new ones
  const hierarchyMapping = new Map<string, string>();
  
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  // Update predecessors for all tasks that reference changed hierarchy numbers
  allTasks.forEach(task => {
    if (!task.predecessor) return;
    
    let hasChanges = false;
    const updatedPredecessors: string[] = [];
    
    // Parse predecessors (could be array or string)
    const predecessorArray = Array.isArray(task.predecessor) 
      ? task.predecessor 
      : [task.predecessor];
    
    predecessorArray.forEach(pred => {
      if (typeof pred === 'string' && hierarchyMapping.has(pred)) {
        updatedPredecessors.push(hierarchyMapping.get(pred)!);
        hasChanges = true;
        console.log(`🔄 Remap predecessor: ${pred} → ${hierarchyMapping.get(pred)}`);
      } else if (typeof pred === 'string') {
        updatedPredecessors.push(pred);
      }
    });
    
    if (hasChanges) {
      predecessorUpdates.push({
        taskId: task.id,
        newPredecessors: updatedPredecessors.length > 0 ? updatedPredecessors : null
      });
    }
  });
  
  console.log(`✅ Outdent calculation complete. Hierarchy updates: ${hierarchyUpdates.length}, Predecessor updates: ${predecessorUpdates.length}`);
  
  return { hierarchyUpdates, predecessorUpdates };
};

export const canOutdent = (task: ProjectTask, allTasks: ProjectTask[]): boolean => {
  // Only children (level 2) can be outdented
  if (!task.hierarchy_number || !task.hierarchy_number.includes('.')) {
    return false;
  }
  
  const hierarchyParts = task.hierarchy_number.split('.');
  return hierarchyParts.length === 2;
};