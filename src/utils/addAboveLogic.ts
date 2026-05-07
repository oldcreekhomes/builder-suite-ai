import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors, PredecessorUpdate } from "./predecessorRemapping";

export interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

export type { PredecessorUpdate };

export interface AddAboveResult {
  newTaskHierarchy: string;
  hierarchyUpdates: HierarchyUpdate[];
  predecessorUpdates: PredecessorUpdate[];
}

/**
 * Add a new task above the target task — at the same depth, under the same parent prefix.
 * Generalized for any depth (top-level, child, grandchild).
 */
export function calculateAddAboveUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): AddAboveResult {
  if (!targetTask.hierarchy_number) {
    throw new Error("Target task must have a hierarchy number");
  }

  const parts = targetTask.hierarchy_number.split(".");
  const depth = parts.length;
  const parentPrefix = parts.slice(0, -1).join("."); // "" for top-level
  const targetLast = parseInt(parts[parts.length - 1]);

  const newTaskHierarchy =
    parentPrefix === "" ? targetLast.toString() : `${parentPrefix}.${targetLast}`;

  // Shift down (by 1) every task at the same depth/parent whose last component >= targetLast,
  // and carry their subtrees with them.
  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();

  const siblingsToShift = allTasks
    .filter(t => {
      if (!t.hierarchy_number) return false;
      const tParts = t.hierarchy_number.split(".");
      if (tParts.length !== depth) return false;
      if (parentPrefix === "") {
        if (tParts.length !== 1) return false;
      } else {
        const tParent = tParts.slice(0, -1).join(".");
        if (tParent !== parentPrefix) return false;
      }
      return parseInt(tParts[tParts.length - 1]) >= targetLast;
    })
    // Process in descending order to avoid intermediate collisions in mapping (visual only)
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split(".").pop()!);
      const bNum = parseInt(b.hierarchy_number!.split(".").pop()!);
      return bNum - aNum;
    });

  for (const sib of siblingsToShift) {
    const sibParts = sib.hierarchy_number!.split(".");
    const newLast = parseInt(sibParts[sibParts.length - 1]) + 1;
    const newSibHierarchy =
      parentPrefix === "" ? newLast.toString() : `${parentPrefix}.${newLast}`;

    hierarchyMapping.set(sib.hierarchy_number!, newSibHierarchy);
    hierarchyUpdates.push({ id: sib.id, hierarchy_number: newSibHierarchy });

    // Carry subtree
    const subtree = allTasks.filter(
      t => t.id !== sib.id && t.hierarchy_number?.startsWith(sib.hierarchy_number! + ".")
    );
    for (const s of subtree) {
      const newChildHierarchy =
        newSibHierarchy + s.hierarchy_number!.substring(sib.hierarchy_number!.length);
      hierarchyMapping.set(s.hierarchy_number!, newChildHierarchy);
      hierarchyUpdates.push({ id: s.id, hierarchy_number: newChildHierarchy });
    }
  }

  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping);

  return { newTaskHierarchy, hierarchyUpdates, predecessorUpdates };
}
