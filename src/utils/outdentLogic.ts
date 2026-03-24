import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors } from "./predecessorRemapping";

interface OutdentResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>;
}

export const computeOutdentUpdates = (targetTask: ProjectTask, allTasks: ProjectTask[]): OutdentResult => {
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];
  
  if (!targetTask.hierarchy_number || !targetTask.hierarchy_number.includes('.')) {
    return { hierarchyUpdates, predecessorUpdates: [] };
  }
  
  const hierarchyParts = targetTask.hierarchy_number.split('.');
  if (hierarchyParts.length !== 2) {
    return { hierarchyUpdates, predecessorUpdates: [] };
  }
  
  const parentHierarchy = hierarchyParts[0];
  const childNumber = parseInt(hierarchyParts[1]);
  
  // Get all current groups sorted
  const currentGroups = allTasks
    .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
    .sort((a, b) => parseInt(a.hierarchy_number!) - parseInt(b.hierarchy_number!));
  
  const parentGroup = currentGroups.find(t => t.hierarchy_number === parentHierarchy);
  if (!parentGroup) {
    return { hierarchyUpdates, predecessorUpdates: [] };
  }
  
  const parentGroupIndex = currentGroups.findIndex(t => t.hierarchy_number === parentHierarchy);
  const newGroupNumber = parseInt(parentHierarchy) + 1;
  
  // Convert target task to a group
  hierarchyUpdates.push({ id: targetTask.id, hierarchy_number: newGroupNumber.toString() });
  
  // Shift all groups after the insertion point
  const groupsToShift = currentGroups.slice(parentGroupIndex + 1);
  groupsToShift.forEach(group => {
    const oldNumber = parseInt(group.hierarchy_number!);
    const newNumber = oldNumber + 1;
    
    hierarchyUpdates.push({ id: group.id, hierarchy_number: newNumber.toString() });
    
    // Update all children of shifted groups
    allTasks.filter(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(group.hierarchy_number! + '.') &&
      t.hierarchy_number.split('.').length === 2
    ).forEach(child => {
      const childParts = child.hierarchy_number!.split('.');
      hierarchyUpdates.push({ id: child.id, hierarchy_number: `${newNumber}.${childParts[1]}` });
    });
  });
  
  // Renumber remaining children of parent group that come after the target
  const childrenToRenumber = allTasks
    .filter(t => 
      t.hierarchy_number && 
      t.hierarchy_number.startsWith(parentHierarchy + '.') &&
      t.hierarchy_number.split('.').length === 2 &&
      t.id !== targetTask.id &&
      parseInt(t.hierarchy_number.split('.')[1]) > childNumber
    )
    .sort((a, b) => parseInt(a.hierarchy_number!.split('.')[1]) - parseInt(b.hierarchy_number!.split('.')[1]));
  
  childrenToRenumber.forEach(child => {
    const oldChildNumber = parseInt(child.hierarchy_number!.split('.')[1]);
    hierarchyUpdates.push({ id: child.id, hierarchy_number: `${parentHierarchy}.${oldChildNumber - 1}` });
  });
  
  // Build hierarchy mapping and use unified predecessor remapping
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  const rawUpdates = remapAllPredecessors(allTasks, hierarchyMapping);
  
  // Convert to the format expected by outdent consumers
  const predecessorUpdates = rawUpdates.map(u => ({
    taskId: u.taskId,
    newPredecessors: u.newPredecessors.length > 0 ? u.newPredecessors : null
  }));
  
  return { hierarchyUpdates, predecessorUpdates };
};

export const canOutdent = (task: ProjectTask, allTasks: ProjectTask[]): boolean => {
  if (!task.hierarchy_number || !task.hierarchy_number.includes('.')) return false;
  return task.hierarchy_number.split('.').length === 2;
};
