import { ProjectTask } from "@/hooks/useProjectTasks";
import { remapAllPredecessors } from "./predecessorRemapping";

export interface TaskUpdate {
  id: string;
  hierarchy_number: string;
}

export interface PredecessorUpdate {
  taskId: string;
  newPredecessors: string[];
}

export interface DeleteTaskResult {
  tasksToDelete: string[];
  hierarchyUpdates: TaskUpdate[];
  predecessorUpdates: PredecessorUpdate[];
  parentGroupsToRecalculate: string[];
}

export const isGroupTask = (task: ProjectTask): boolean => {
  return !!task.hierarchy_number && !task.hierarchy_number.includes('.');
};

/**
 * Generalized delete: works at any depth.
 * Removes the task and all its descendants, then shifts later siblings (and their subtrees)
 * down by one at the deleted task's depth.
 */
export const computeDeleteUpdates = (
  targetTask: ProjectTask,
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  if (!targetTask.hierarchy_number) throw new Error("Target task must have a hierarchy number");

  const targetHierarchy = targetTask.hierarchy_number;
  const targetParts = targetHierarchy.split('.');
  const targetDepth = targetParts.length;
  const parentPrefix = targetParts.slice(0, -1).join('.'); // "" for top-level
  const targetLast = parseInt(targetParts[targetParts.length - 1]);

  // 1. Collect all descendants (subtree of target).
  const descendants = allTasks.filter(t =>
    t.id !== targetTask.id && t.hierarchy_number?.startsWith(targetHierarchy + '.')
  );

  const tasksToDelete = [targetTask.id, ...descendants.map(t => t.id)];
  const deletedHierarchyNumbers = [targetHierarchy, ...descendants.map(t => t.hierarchy_number!)];

  // 2. Find later siblings at the same depth/parent.
  const laterSiblings = allTasks
    .filter(t => {
      if (!t.hierarchy_number || t.id === targetTask.id) return false;
      const parts = t.hierarchy_number.split('.');
      if (parts.length !== targetDepth) return false;
      if (parentPrefix === '') {
        if (parts.length !== 1) return false;
      } else {
        const tParent = parts.slice(0, -1).join('.');
        if (tParent !== parentPrefix) return false;
      }
      return parseInt(parts[parts.length - 1]) > targetLast;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split('.').pop()!);
      const bNum = parseInt(b.hierarchy_number!.split('.').pop()!);
      return aNum - bNum;
    });

  const hierarchyUpdates: TaskUpdate[] = [];
  const hierarchyMapping = new Map<string, string>();

  for (const sib of laterSiblings) {
    const sibParts = sib.hierarchy_number!.split('.');
    const newLast = parseInt(sibParts[sibParts.length - 1]) - 1;
    if (newLast <= 0) continue;
    const newSibHierarchy = parentPrefix === '' ? newLast.toString() : `${parentPrefix}.${newLast}`;

    hierarchyMapping.set(sib.hierarchy_number!, newSibHierarchy);
    hierarchyUpdates.push({ id: sib.id, hierarchy_number: newSibHierarchy });

    // Carry subtree
    const subtree = allTasks.filter(
      t => t.id !== sib.id && t.hierarchy_number?.startsWith(sib.hierarchy_number! + '.')
    );
    for (const s of subtree) {
      const newChild = newSibHierarchy + s.hierarchy_number!.substring(sib.hierarchy_number!.length);
      hierarchyMapping.set(s.hierarchy_number!, newChild);
      hierarchyUpdates.push({ id: s.id, hierarchy_number: newChild });
    }
  }

  const predecessorUpdates = remapAllPredecessors(allTasks, hierarchyMapping, deletedHierarchyNumbers);

  // Parent group(s) to recalculate dates for: any ancestor of the deleted task.
  const parentGroupsToRecalculate: string[] = [];
  for (let i = 1; i < targetParts.length; i++) {
    parentGroupsToRecalculate.push(targetParts.slice(0, i).join('.'));
  }

  return {
    tasksToDelete,
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate,
  };
};

// Kept as compatibility export — same as computeDeleteUpdates now.
export const computeDeleteChildUpdates = computeDeleteUpdates;
export const computeDeleteGroupUpdates = computeDeleteUpdates;

/**
 * Bulk delete: process deletions sequentially using the unified single-delete logic
 * applied to a running snapshot of the task list.
 */
export const computeBulkDeleteUpdates = (
  selectedTaskIds: string[],
  allTasks: ProjectTask[]
): DeleteTaskResult => {
  // Resolve actual tasks to delete: include descendants of each selection,
  // and dedupe so that a selection nested inside another isn't processed twice.
  const selectedSet = new Set(selectedTaskIds);
  const idsByHierarchy = new Map<string, ProjectTask>();
  allTasks.forEach(t => {
    if (t.hierarchy_number) idsByHierarchy.set(t.hierarchy_number, t);
  });

  // Filter to top-most selected (ones whose ancestor isn't also selected)
  const initialTargets: ProjectTask[] = allTasks.filter(t => {
    if (!selectedSet.has(t.id) || !t.hierarchy_number) return false;
    const parts = t.hierarchy_number.split('.');
    for (let i = 1; i < parts.length; i++) {
      const ancestorH = parts.slice(0, i).join('.');
      const ancestor = idsByHierarchy.get(ancestorH);
      if (ancestor && selectedSet.has(ancestor.id)) return false;
    }
    return true;
  });

  // Sort by hierarchy DESCENDING so deletions don't shift things we haven't processed yet.
  initialTargets.sort((a, b) =>
    b.hierarchy_number!.localeCompare(a.hierarchy_number!, undefined, { numeric: true })
  );

  let workingTasks = [...allTasks];
  const allDeleteIds: string[] = [];
  const cumulativeMapping = new Map<string, string>();
  const deletedHierarchies: string[] = [];
  const parentGroupsToRecalculate = new Set<string>();

  for (const target of initialTargets) {
    const current = workingTasks.find(t => t.id === target.id);
    if (!current) continue;
    const single = computeDeleteUpdates(current, workingTasks);
    allDeleteIds.push(...single.tasksToDelete);
    deletedHierarchies.push(...single.tasksToDelete
      .map(id => workingTasks.find(t => t.id === id)?.hierarchy_number)
      .filter((h): h is string => !!h));

    // Apply to workingTasks: remove deleted, apply hierarchy updates
    const updateMap = new Map(single.hierarchyUpdates.map(u => [u.id, u.hierarchy_number]));
    workingTasks = workingTasks
      .filter(t => !single.tasksToDelete.includes(t.id))
      .map(t => updateMap.has(t.id) ? { ...t, hierarchy_number: updateMap.get(t.id)! } : t);

    // Merge mapping (compose: oldHierarchy → final new hierarchy)
    for (const u of single.hierarchyUpdates) {
      // Find the oldest hierarchy that mapped into the value being remapped now.
      // u.id is stable, but mapping is keyed by hierarchy. We approximate by setting
      // direct old→new based on the pre-step working state.
      // Simpler: recompute mapping at end from finalHierarchy comparison below.
    }

    single.parentGroupsToRecalculate.forEach(p => parentGroupsToRecalculate.add(p));
  }

  // Final hierarchyUpdates: compare remaining workingTasks vs original allTasks.
  const hierarchyUpdates: TaskUpdate[] = [];
  const finalMapping = new Map<string, string>();
  for (const wt of workingTasks) {
    const orig = allTasks.find(t => t.id === wt.id);
    if (orig && orig.hierarchy_number !== wt.hierarchy_number && wt.hierarchy_number) {
      hierarchyUpdates.push({ id: wt.id, hierarchy_number: wt.hierarchy_number });
      if (orig.hierarchy_number) finalMapping.set(orig.hierarchy_number, wt.hierarchy_number);
    }
  }

  const predecessorUpdates = remapAllPredecessors(allTasks, finalMapping, deletedHierarchies);

  return {
    tasksToDelete: Array.from(new Set(allDeleteIds)),
    hierarchyUpdates,
    predecessorUpdates,
    parentGroupsToRecalculate: Array.from(parentGroupsToRecalculate),
  };
};
