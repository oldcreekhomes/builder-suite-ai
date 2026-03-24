import { ProjectTask } from "@/hooks/useProjectTasks";
import { renumberTasks } from "@/utils/hierarchyUtils";
import { remapAllPredecessors } from "@/utils/predecessorRemapping";

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
  const renumberedTasks = renumberTasks(allTasks);
  
  const hierarchyUpdates = renumberedTasks
    .filter(task => task.hierarchy_number !== allTasks.find(t => t.id === task.id)?.hierarchy_number)
    .map(task => ({ id: task.id, hierarchy_number: task.hierarchy_number! }));
  
  const hierarchyMapping = new Map<string, string>();
  hierarchyUpdates.forEach(update => {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  });
  
  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping);
  
  return { hierarchyUpdates, predecessorUpdates };
};

/**
 * Checks if normalization is needed (first task is not 1 or gaps exist)
 */
export const needsNormalization = (allTasks: ProjectTask[]): boolean => {
  if (allTasks.length === 0) return false;
  
  const topLevelTasks = allTasks
    .filter(task => task.hierarchy_number && !task.hierarchy_number.includes('.'))
    .sort((a, b) => (a.hierarchy_number || '').localeCompare(b.hierarchy_number || '', undefined, { numeric: true }));
  
  if (topLevelTasks.length > 0 && topLevelTasks[0].hierarchy_number !== '1') return true;
  
  const topLevelNumbers = new Set<number>();
  const childNumbersByGroup = new Map<string, Set<number>>();
  
  for (const task of allTasks) {
    if (!task.hierarchy_number) continue;
    const parts = task.hierarchy_number.split('.');
    if (parts.length === 1) {
      topLevelNumbers.add(parseInt(parts[0]));
    } else if (parts.length === 2) {
      const group = parts[0];
      if (!childNumbersByGroup.has(group)) childNumbersByGroup.set(group, new Set());
      childNumbersByGroup.get(group)!.add(parseInt(parts[1]));
    }
  }
  
  const maxTopLevel = Math.max(...Array.from(topLevelNumbers));
  for (let i = 1; i <= maxTopLevel; i++) {
    if (!topLevelNumbers.has(i)) return true;
  }
  
  for (const [, childNumbers] of childNumbersByGroup.entries()) {
    const maxChild = Math.max(...Array.from(childNumbers));
    for (let i = 1; i <= maxChild; i++) {
      if (!childNumbers.has(i)) return true;
    }
  }
  
  return false;
};
