/**
 * Unified predecessor remapping utility.
 * All operations (add, delete, indent, outdent, drag-drop) use this single function.
 */

import { ProjectTask } from "@/hooks/useProjectTasks";
import { safeParsePredecessors } from "./predecessorValidation";

export interface PredecessorUpdate {
  taskId: string;
  oldPredecessors: string[];
  newPredecessors: string[];
}

/**
 * Remap a single predecessor string using the hierarchy mapping.
 * Handles formats: "9.2", "9.2SS", "9.2SS+5d", "9.2FS-3d"
 */
function remapSinglePredecessor(
  predecessor: string,
  hierarchyMapping: Map<string, string>
): string {
  const match = predecessor.match(/^(\d+(?:\.\d+)*)(SS|FS|FF|SF)?([+-]\d+d?)?$/i);
  if (!match) return predecessor;

  const [, hierarchyNum, linkType = '', lag = ''] = match;
  const newHierarchy = hierarchyMapping.get(hierarchyNum);
  return newHierarchy ? `${newHierarchy}${linkType}${lag}` : predecessor;
}

/**
 * Unified function to remap all predecessor references when hierarchy numbers change.
 * 
 * - Removes references to deleted hierarchies
 * - Remaps references to moved hierarchies  
 * - Prevents self-references (predecessor pointing to task's own new hierarchy)
 * 
 * Used by: add above/below, delete, indent, outdent, drag-drop
 */
export function remapAllPredecessors(
  allTasks: ProjectTask[],
  hierarchyMapping: Map<string, string>,
  deletedHierarchies: string[] = []
): PredecessorUpdate[] {
  const updates: PredecessorUpdate[] = [];

  if (hierarchyMapping.size === 0 && deletedHierarchies.length === 0) {
    return updates;
  }

  for (const task of allTasks) {
    if (!task.predecessor) continue;

    const predecessors = safeParsePredecessors(task.predecessor);
    if (predecessors.length === 0) continue;

    // Get this task's NEW hierarchy number (after remapping)
    const taskNewHierarchy = hierarchyMapping.get(task.hierarchy_number || '') || task.hierarchy_number;

    const newPredecessors = predecessors
      // Step 1: Remove deleted hierarchy references
      .filter(pred => {
        const match = pred.match(/^(\d+(?:\.\d+)*)/);
        if (!match) return true;
        return !deletedHierarchies.includes(match[1]);
      })
      // Step 2: Remap remaining predecessors
      .map(pred => remapSinglePredecessor(pred, hierarchyMapping))
      // Step 3: Remove self-references
      .filter(pred => {
        const match = pred.match(/^(\d+(?:\.\d+)*)/);
        if (!match) return true;
        return match[1] !== taskNewHierarchy;
      });

    // Only emit update if predecessors changed
    if (JSON.stringify(predecessors) !== JSON.stringify(newPredecessors)) {
      updates.push({
        taskId: task.id,
        oldPredecessors: predecessors,
        newPredecessors,
      });
    }
  }

  return updates;
}
