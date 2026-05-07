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
  
  // Group last-component numbers by parent prefix at every depth.
  // "1" → parent prefix "", last 1
  // "1.2" → parent prefix "1", last 2
  // "1.2.3" → parent prefix "1.2", last 3
  const numbersByParent = new Map<string, Set<number>>();

  for (const task of allTasks) {
    if (!task.hierarchy_number) continue;
    const parts = task.hierarchy_number.split('.');
    const parent = parts.slice(0, -1).join('.');
    const last = parseInt(parts[parts.length - 1]);
    if (isNaN(last)) continue;
    if (!numbersByParent.has(parent)) numbersByParent.set(parent, new Set());
    numbersByParent.get(parent)!.add(last);
  }

  for (const [, nums] of numbersByParent.entries()) {
    if (nums.size === 0) continue;
    const max = Math.max(...Array.from(nums));
    for (let i = 1; i <= max; i++) {
      if (!nums.has(i)) return true;
    }
  }

  return false;
};
