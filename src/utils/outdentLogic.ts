import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors } from "./predecessorRemapping";

interface OutdentResult {
  hierarchyUpdates: Array<{ id: string; hierarchy_number: string }>;
  predecessorUpdates: Array<{ taskId: string; newPredecessors: string[] | null }>;
}

/**
 * Outdent a task one level (depth N → N-1).
 * The task slots in just after its current parent at the parent's level,
 * carrying its subtree along. Later siblings of the parent shift down by 1,
 * and the task's former siblings (those after it) become its new children
 * — they remain at the original parent so their numbering shifts down.
 */
export const computeOutdentUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): OutdentResult => {
  const hierarchyUpdates: Array<{ id: string; hierarchy_number: string }> = [];

  if (!targetTask.hierarchy_number || !targetTask.hierarchy_number.includes(".")) {
    return { hierarchyUpdates, predecessorUpdates: [] };
  }

  const targetHierarchy = targetTask.hierarchy_number;
  const targetParts = targetHierarchy.split(".");
  const targetDepth = targetParts.length; // e.g. 2 for "1.2", 3 for "1.2.3"
  const parentHierarchy = targetParts.slice(0, -1).join("."); // e.g. "1" or "1.2"
  const grandparentHierarchy = targetParts.slice(0, -2).join("."); // e.g. "" or "1"
  const targetLast = parseInt(targetParts[targetParts.length - 1]);
  const parentLast = parseInt(targetParts[targetParts.length - 2]);

  // Find later siblings of parent at parent's depth (under same grandparent)
  const parentDepth = targetDepth - 1;
  const laterParentSiblings = allTasks
    .filter(t => {
      if (!t.hierarchy_number) return false;
      const parts = t.hierarchy_number.split(".");
      if (parts.length !== parentDepth) return false;
      if (grandparentHierarchy === "") {
        if (parts.length !== 1) return false;
      } else {
        const gp = parts.slice(0, -1).join(".");
        if (gp !== grandparentHierarchy) return false;
      }
      return parseInt(parts[parts.length - 1]) > parentLast;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split(".").pop()!);
      const bNum = parseInt(b.hierarchy_number!.split(".").pop()!);
      return aNum - bNum;
    });

  // The new hierarchy of the outdented task = grandparent.<parentLast + 1>
  const newTargetLast = parentLast + 1;
  const newTargetHierarchy =
    grandparentHierarchy === ""
      ? newTargetLast.toString()
      : `${grandparentHierarchy}.${newTargetLast}`;

  hierarchyUpdates.push({ id: targetTask.id, hierarchy_number: newTargetHierarchy });

  // Carry the target's subtree along (re-prefix from old → new).
  const targetSubtree = allTasks.filter(
    t => t.id !== targetTask.id && t.hierarchy_number?.startsWith(targetHierarchy + ".")
  );
  for (const d of targetSubtree) {
    hierarchyUpdates.push({
      id: d.id,
      hierarchy_number: newTargetHierarchy + d.hierarchy_number!.substring(targetHierarchy.length),
    });
  }

  // Shift later parent-level siblings down by 1, carrying their subtrees.
  for (const sib of laterParentSiblings) {
    const sibParts = sib.hierarchy_number!.split(".");
    const newLast = parseInt(sibParts[sibParts.length - 1]) + 1;
    const newSibHierarchy =
      grandparentHierarchy === ""
        ? newLast.toString()
        : `${grandparentHierarchy}.${newLast}`;
    hierarchyUpdates.push({ id: sib.id, hierarchy_number: newSibHierarchy });

    const subtree = allTasks.filter(
      t => t.id !== sib.id && t.hierarchy_number?.startsWith(sib.hierarchy_number! + ".")
    );
    for (const s of subtree) {
      hierarchyUpdates.push({
        id: s.id,
        hierarchy_number: newSibHierarchy + s.hierarchy_number!.substring(sib.hierarchy_number!.length),
      });
    }
  }

  // Renumber the target's former later siblings (same parent, after target) — shift down by 1.
  const formerLaterSiblings = allTasks
    .filter(t => {
      if (!t.hierarchy_number || t.id === targetTask.id) return false;
      const parts = t.hierarchy_number.split(".");
      if (parts.length !== targetDepth) return false;
      const tParent = parts.slice(0, -1).join(".");
      if (tParent !== parentHierarchy) return false;
      return parseInt(parts[parts.length - 1]) > targetLast;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split(".").pop()!);
      const bNum = parseInt(b.hierarchy_number!.split(".").pop()!);
      return aNum - bNum;
    });

  for (const sib of formerLaterSiblings) {
    const sibParts = sib.hierarchy_number!.split(".");
    const newLast = parseInt(sibParts[sibParts.length - 1]) - 1;
    if (newLast <= 0) continue;
    const newSibHierarchy = `${parentHierarchy}.${newLast}`;
    hierarchyUpdates.push({ id: sib.id, hierarchy_number: newSibHierarchy });

    const subtree = allTasks.filter(
      t => t.id !== sib.id && t.hierarchy_number?.startsWith(sib.hierarchy_number! + ".")
    );
    for (const s of subtree) {
      hierarchyUpdates.push({
        id: s.id,
        hierarchy_number: newSibHierarchy + s.hierarchy_number!.substring(sib.hierarchy_number!.length),
      });
    }
  }

  // Build mapping for predecessor remapping
  const hierarchyMapping = new Map<string, string>();
  for (const update of hierarchyUpdates) {
    const oldTask = allTasks.find(t => t.id === update.id);
    if (oldTask?.hierarchy_number) {
      hierarchyMapping.set(oldTask.hierarchy_number, update.hierarchy_number);
    }
  }

  const rawUpdates = remapAllPredecessors(allTasks, hierarchyMapping);
  const predecessorUpdates = rawUpdates.map(u => ({
    taskId: u.taskId,
    newPredecessors: u.newPredecessors.length > 0 ? u.newPredecessors : null,
  }));

  return { hierarchyUpdates, predecessorUpdates };
};

/**
 * Outdentable as long as the task has at least one dot (depth >= 2).
 */
export const canOutdent = (task: ProjectTask, _allTasks: ProjectTask[]): boolean => {
  if (!task.hierarchy_number || !task.hierarchy_number.includes(".")) return false;
  return true;
};
