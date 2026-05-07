import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors, PredecessorUpdate } from "./predecessorRemapping";
import { MAX_HIERARCHY_DEPTH } from "./hierarchyUtils";

export interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

export type { PredecessorUpdate };

export interface AddBelowResult {
  newTaskHierarchy: string;
  hierarchyUpdates: HierarchyUpdate[];
  predecessorUpdates: PredecessorUpdate[];
}

/**
 * Add a new task below the target.
 *  - If target has children AND adding a child would not exceed MAX depth → add as last child.
 *  - Otherwise → add as next sibling at target's depth.
 */
export function calculateAddBelowUpdates(
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): AddBelowResult {
  if (!targetTask.hierarchy_number) {
    throw new Error("Target task must have a hierarchy number");
  }

  const targetHierarchy = targetTask.hierarchy_number;
  const targetParts = targetHierarchy.split(".");
  const targetDepth = targetParts.length;

  // Does target have any direct children?
  const directChildren = allTasks.filter(t => {
    if (!t.hierarchy_number) return false;
    const parts = t.hierarchy_number.split(".");
    return (
      parts.length === targetDepth + 1 &&
      t.hierarchy_number.startsWith(targetHierarchy + ".")
    );
  });

  if (directChildren.length > 0 && targetDepth + 1 <= MAX_HIERARCHY_DEPTH) {
    // Add as last child
    const maxChildLast = Math.max(
      ...directChildren.map(c => parseInt(c.hierarchy_number!.split(".").pop()!) || 0)
    );
    return {
      newTaskHierarchy: `${targetHierarchy}.${maxChildLast + 1}`,
      hierarchyUpdates: [],
      predecessorUpdates: [],
    };
  }

  // Otherwise: insert as next sibling at target's depth.
  const parentPrefix = targetParts.slice(0, -1).join(".");
  const targetLast = parseInt(targetParts[targetParts.length - 1]);
  const newTaskHierarchy =
    parentPrefix === "" ? (targetLast + 1).toString() : `${parentPrefix}.${targetLast + 1}`;

  const siblingsToShift = allTasks
    .filter(t => {
      if (!t.hierarchy_number) return false;
      const parts = t.hierarchy_number.split(".");
      if (parts.length !== targetDepth) return false;
      if (parentPrefix === "") {
        if (parts.length !== 1) return false;
      } else {
        const tParent = parts.slice(0, -1).join(".");
        if (tParent !== parentPrefix) return false;
      }
      return parseInt(parts[parts.length - 1]) > targetLast;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split(".").pop()!);
      const bNum = parseInt(b.hierarchy_number!.split(".").pop()!);
      return bNum - aNum;
    });

  const hierarchyUpdates: HierarchyUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();

  for (const sib of siblingsToShift) {
    const sibParts = sib.hierarchy_number!.split(".");
    const newLast = parseInt(sibParts[sibParts.length - 1]) + 1;
    const newSibHierarchy =
      parentPrefix === "" ? newLast.toString() : `${parentPrefix}.${newLast}`;
    hierarchyMapping.set(sib.hierarchy_number!, newSibHierarchy);
    hierarchyUpdates.push({ id: sib.id, hierarchy_number: newSibHierarchy });

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
