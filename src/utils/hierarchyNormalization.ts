import { ProjectTask } from "@/hooks/useProjectTasks";
import { renumberTasks } from "@/utils/hierarchyUtils";
import { remapPredecessors } from "@/utils/deleteTaskLogic";

export interface NormalizationResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] }>;
}

/**
 * Normalizes task hierarchy to ensure first row is 1 and no gaps exist
 */
export const computeNormalizationUpdates = (
  allTasks: ProjectTask[]
): NormalizationResult => {
  console.log(`🔢 Computing normalization for ${allTasks.length} tasks`);
  
  // Get renumbered tasks
  const renumberedTasks = renumberTasks(allTasks);
  
  // Find tasks that need hierarchy updates
  const hierarchyUpdates = renumberedTasks
    .filter(task => task.hierarchy_number !== allTasks.find(t => t.id === task.id)?.hierarchy_number)
    .map(task => ({
      id: task.id,
      hierarchy_number: task.hierarchy_number!
    }));
  
  console.log(`📋 Found ${hierarchyUpdates.length} hierarchy updates needed for normalization`);
  
  // Build hierarchy mapping for predecessor remapping
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  // Generate predecessor remapping updates
  const predecessorUpdates = remapPredecessors(allTasks, hierarchyMapping);
  
  console.log(`🔗 Found ${predecessorUpdates.length} predecessor updates needed for normalization`);
  
  return {
    hierarchyUpdates,
    predecessorUpdates
  };
};

/**
 * Checks if normalization is needed (first task is not 1 or gaps exist)
 */
export const needsNormalization = (allTasks: ProjectTask[]): boolean => {
  if (allTasks.length === 0) return false;
  
  // Get top-level tasks only for the "first row is 1" check
  const topLevelTasks = allTasks
    .filter(task => task.hierarchy_number && !task.hierarchy_number.includes('.'))
    .sort((a, b) => {
      const aHierarchy = a.hierarchy_number || '';
      const bHierarchy = b.hierarchy_number || '';
      return aHierarchy.localeCompare(bHierarchy, undefined, { numeric: true });
    });
  
  // Check if first top-level task is 1
  if (topLevelTasks.length > 0) {
    const firstTopLevelTask = topLevelTasks[0];
    if (firstTopLevelTask.hierarchy_number !== '1') {
      console.log(`🚨 First top-level task hierarchy is ${firstTopLevelTask.hierarchy_number}, not 1`);
      return true;
    }
  }
  
  // Check for gaps in numbering
  const topLevelNumbers = new Set<number>();
  const childNumbersByGroup = new Map<string, Set<number>>();
  
  for (const task of allTasks) {
    if (!task.hierarchy_number) continue;
    
    const parts = task.hierarchy_number.split('.');
    if (parts.length === 1) {
      // Top level task
      topLevelNumbers.add(parseInt(parts[0]));
    } else if (parts.length === 2) {
      // Child task
      const groupNumber = parts[0];
      const childNumber = parseInt(parts[1]);
      
      if (!childNumbersByGroup.has(groupNumber)) {
        childNumbersByGroup.set(groupNumber, new Set());
      }
      childNumbersByGroup.get(groupNumber)!.add(childNumber);
    }
  }
  
  // Check for gaps in top-level numbering
  const maxTopLevel = Math.max(...Array.from(topLevelNumbers));
  for (let i = 1; i <= maxTopLevel; i++) {
    if (!topLevelNumbers.has(i)) {
      console.log(`🚨 Gap found in top-level numbering: missing ${i}`);
      return true;
    }
  }
  
  // Check for gaps in child numbering within each group
  for (const [groupNumber, childNumbers] of childNumbersByGroup.entries()) {
    const maxChild = Math.max(...Array.from(childNumbers));
    for (let i = 1; i <= maxChild; i++) {
      if (!childNumbers.has(i)) {
        console.log(`🚨 Gap found in group ${groupNumber} child numbering: missing ${i}`);
        return true;
      }
    }
  }
  
  return false;
};