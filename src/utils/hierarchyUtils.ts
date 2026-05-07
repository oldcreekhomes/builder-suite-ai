import { ProjectTask } from "@/hooks/useProjectTasks";

/**
 * Maximum hierarchy depth (Parent → Child → Grandchild = 3 levels).
 * Depth 1 = parent (e.g. "1"), 2 = child ("1.2"), 3 = grandchild ("1.2.3").
 */
export const MAX_HIERARCHY_DEPTH = 3;

/**
 * Get the parent hierarchy number from a given hierarchy number
 * Example: "1.2.3" -> "1.2"
 */
export function getParentHierarchy(hierarchyNumber: string): string | null {
  if (!hierarchyNumber) return null;
  const parts = hierarchyNumber.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

/**
 * Get all immediate children of a parent hierarchy
 */
export function getChildren(tasks: ProjectTask[], parentHierarchy: string): ProjectTask[] {
  if (!parentHierarchy) return [];
  return tasks.filter(task =>
    task.hierarchy_number &&
    task.hierarchy_number.startsWith(parentHierarchy + ".") &&
    task.hierarchy_number.split(".").length === parentHierarchy.split(".").length + 1
  );
}

/**
 * Hierarchy depth (1-based: "1" → 1, "1.2" → 2, "1.2.3" → 3)
 */
export function getHierarchyDepth(hierarchyNumber: string): number {
  if (!hierarchyNumber) return 0;
  return hierarchyNumber.split(".").length;
}

/**
 * Visual indent level (0-based)
 */
export function getLevel(hierarchyNumber: string): number {
  if (!hierarchyNumber) return 0;
  return hierarchyNumber.split(".").length - 1;
}

export function getIndentLevel(hierarchyNumber: string): number {
  return getLevel(hierarchyNumber);
}

/**
 * Sort tasks by hierarchy number (numeric-aware).
 */
function sortByHierarchy(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((a, b) => {
    const aNum = a.hierarchy_number || "999";
    const bNum = b.hierarchy_number || "999";
    return aNum.localeCompare(bNum, undefined, { numeric: true });
  });
}

export function canIndent(task: ProjectTask, tasks: ProjectTask[]): boolean {
  if (!task.hierarchy_number) return false;

  const sortedTasks = sortByHierarchy(tasks);
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  if (currentIndex <= 0) return false;

  // Predict the indented depth based on the previous visible task.
  const previous = sortedTasks[currentIndex - 1];
  if (!previous.hierarchy_number) return false;
  const prevDepth = getHierarchyDepth(previous.hierarchy_number);
  const currentDepth = getHierarchyDepth(task.hierarchy_number);

  // If previous is at same or deeper level → become its sibling at prev's depth.
  // If previous is at shallower level (parent) → become its child at prevDepth+1.
  const targetDepth = prevDepth >= currentDepth ? prevDepth + (prevDepth === currentDepth - 1 ? 0 : 0) : prevDepth + 1;
  // Simpler: the result of generateIndentHierarchy decides — just enforce cap there.
  // Block when result would exceed MAX_HIERARCHY_DEPTH.
  const projected = generateIndentHierarchy(task, tasks);
  if (!projected) return false;
  if (getHierarchyDepth(projected) > MAX_HIERARCHY_DEPTH) return false;
  return true;
}

export function generateIndentHierarchy(task: ProjectTask, tasks: ProjectTask[]): string | null {
  if (!task.hierarchy_number) return null;

  const sortedTasks = sortByHierarchy(tasks);
  const currentIndex = sortedTasks.findIndex(t => t.id === task.id);
  if (currentIndex <= 0) return null;

  const previousTask = sortedTasks[currentIndex - 1];
  const previousHierarchy = previousTask.hierarchy_number;
  if (!previousHierarchy) return null;

  const prevDepth = getHierarchyDepth(previousHierarchy);
  const currentDepth = getHierarchyDepth(task.hierarchy_number);

  // Target parent is the previous task if it is one level shallower or same/deeper level
  // Algorithm (matches prior behavior):
  //   - If previous is same depth as current → indent under previous (becomes its child).
  //   - If previous is deeper than current → become a sibling of previous (under previous's parent).
  //   - If previous is shallower → become previous's child (one deeper).
  let parentHierarchy: string;
  let newDepth: number;

  if (prevDepth >= currentDepth) {
    // Become sibling of previous at previous's depth (if same depth, indent under prev's parent...
    // but previous itself is at currentDepth meaning prev shares parent → we instead indent UNDER previous).
    if (prevDepth === currentDepth) {
      // Indent under the previous sibling → become its first child.
      parentHierarchy = previousHierarchy;
      newDepth = prevDepth + 1;
    } else {
      // Previous is deeper: become its sibling.
      const prevParts = previousHierarchy.split(".");
      parentHierarchy = prevParts.slice(0, -1).join(".");
      newDepth = prevDepth;
    }
  } else {
    // Previous is shallower → become previous's child.
    parentHierarchy = previousHierarchy;
    newDepth = prevDepth + 1;
  }

  if (newDepth > MAX_HIERARCHY_DEPTH) return null;

  // Find next sibling number under parentHierarchy at newDepth.
  const existingChildren = tasks.filter(t => {
    if (!t.hierarchy_number || t.id === task.id) return false;
    if (parentHierarchy === "") {
      // top-level
      return !t.hierarchy_number.includes(".");
    }
    return (
      t.hierarchy_number.startsWith(parentHierarchy + ".") &&
      t.hierarchy_number.split(".").length === newDepth
    );
  });

  const nextNumber = existingChildren.length + 1;
  return parentHierarchy === "" ? nextNumber.toString() : `${parentHierarchy}.${nextNumber}`;
}

function isValidHierarchyNumber(hierarchyNumber: string): boolean {
  if (!hierarchyNumber) return false;
  const parts = hierarchyNumber.split(".");
  return parts.every(part => {
    const num = parseInt(part);
    return !isNaN(num) && num > 0;
  });
}

/**
 * Generate all updates needed when indenting a task.
 * Generalized to any depth: shifts the indented task's former siblings (same prefix, same depth)
 * down by 1, and pulls along their subtrees.
 */
export function generateIndentUpdates(
  task: ProjectTask,
  tasks: ProjectTask[]
): Array<{ id: string; hierarchy_number: string }> {
  if (!task.hierarchy_number) return [];

  const originalHierarchy = task.hierarchy_number;
  const originalParts = originalHierarchy.split(".");
  const originalDepth = originalParts.length;
  const originalParent = originalParts.slice(0, -1).join("."); // "" if top-level
  const originalLast = parseInt(originalParts[originalParts.length - 1]);

  const newHierarchy = generateIndentHierarchy(task, tasks);
  if (!newHierarchy || !isValidHierarchyNumber(newHierarchy)) return [];
  if (getHierarchyDepth(newHierarchy) > MAX_HIERARCHY_DEPTH) return [];

  // Collision check
  if (tasks.some(t => t.id !== task.id && t.hierarchy_number === newHierarchy)) {
    console.warn(`Cannot indent: hierarchy number "${newHierarchy}" already exists`);
    return [];
  }

  const updates: Array<{ id: string; hierarchy_number: string }> = [];

  // 1. The indented task itself moves
  updates.push({ id: task.id, hierarchy_number: newHierarchy });

  // 2. Move the indented task's descendants along with it (re-prefix).
  const descendants = tasks.filter(
    t => t.id !== task.id && t.hierarchy_number?.startsWith(originalHierarchy + ".")
  );
  // Depth-cap check: any descendant must still fit within MAX.
  for (const d of descendants) {
    const newDescHierarchy = newHierarchy + d.hierarchy_number!.substring(originalHierarchy.length);
    if (getHierarchyDepth(newDescHierarchy) > MAX_HIERARCHY_DEPTH) {
      console.warn(`Cannot indent: descendant ${d.hierarchy_number} would exceed depth ${MAX_HIERARCHY_DEPTH}`);
      return [];
    }
  }
  for (const d of descendants) {
    updates.push({
      id: d.id,
      hierarchy_number: newHierarchy + d.hierarchy_number!.substring(originalHierarchy.length),
    });
  }

  // 3. Renumber the indented task's former siblings (same prefix, same depth) whose
  //    last component > originalLast, shifting down by 1; carry their subtrees.
  const formerSiblings = tasks
    .filter(t => {
      if (!t.hierarchy_number || t.id === task.id) return false;
      const parts = t.hierarchy_number.split(".");
      if (parts.length !== originalDepth) return false;
      if (originalParent === "") return parts.length === 1;
      const tParent = parts.slice(0, -1).join(".");
      if (tParent !== originalParent) return false;
      return parseInt(parts[parts.length - 1]) > originalLast;
    })
    .sort((a, b) => {
      const aNum = parseInt(a.hierarchy_number!.split(".").pop()!);
      const bNum = parseInt(b.hierarchy_number!.split(".").pop()!);
      return aNum - bNum;
    });

  for (const sib of formerSiblings) {
    const sibParts = sib.hierarchy_number!.split(".");
    const newLast = parseInt(sibParts[sibParts.length - 1]) - 1;
    if (newLast <= 0) continue;
    const newSibHierarchy =
      originalParent === "" ? newLast.toString() : `${originalParent}.${newLast}`;

    updates.push({ id: sib.id, hierarchy_number: newSibHierarchy });

    // Carry subtree of this sibling
    const sibSubtree = tasks.filter(
      t => t.id !== sib.id && t.hierarchy_number?.startsWith(sib.hierarchy_number! + ".")
    );
    for (const s of sibSubtree) {
      updates.push({
        id: s.id,
        hierarchy_number: newSibHierarchy + s.hierarchy_number!.substring(sib.hierarchy_number!.length),
      });
    }
  }

  return updates;
}

/**
 * Renumber all tasks so that hierarchy numbers are dense from 1.
 * Recursive across all depths up to MAX_HIERARCHY_DEPTH.
 */
export function renumberTasks(tasks: ProjectTask[]): ProjectTask[] {
  const sortedTasks = sortByHierarchy(tasks);
  const result = sortedTasks.map(t => ({ ...t }));
  const resultMap = new Map<string, ProjectTask>();
  result.forEach(t => resultMap.set(t.id, t));

  // Build a mapping of OLD hierarchy → NEW hierarchy by walking depths.
  const oldToNew = new Map<string, string>();

  const renumberLevel = (parentOldHierarchy: string, parentNewHierarchy: string, depth: number) => {
    if (depth > MAX_HIERARCHY_DEPTH) return;

    const children = sortedTasks
      .filter(t => {
        if (!t.hierarchy_number) return false;
        const parts = t.hierarchy_number.split(".");
        if (parts.length !== depth) return false;
        if (parentOldHierarchy === "") return parts.length === 1;
        return t.hierarchy_number.startsWith(parentOldHierarchy + ".") && parts.length === depth;
      })
      .sort((a, b) => {
        const aNum = parseInt(a.hierarchy_number!.split(".").pop()!);
        const bNum = parseInt(b.hierarchy_number!.split(".").pop()!);
        return aNum - bNum;
      });

    let counter = 1;
    for (const child of children) {
      const newHierarchy =
        parentNewHierarchy === "" ? counter.toString() : `${parentNewHierarchy}.${counter}`;
      oldToNew.set(child.hierarchy_number!, newHierarchy);
      const r = resultMap.get(child.id);
      if (r) r.hierarchy_number = newHierarchy;
      // Recurse into this child's subtree.
      renumberLevel(child.hierarchy_number!, newHierarchy, depth + 1);
      counter++;
    }
  };

  renumberLevel("", "", 1);

  return result;
}

/**
 * Check if a task is a child of another task
 */
export function isChildOf(childHierarchy: string, parentHierarchy: string): boolean {
  if (!childHierarchy || !parentHierarchy) return false;
  return childHierarchy.startsWith(parentHierarchy + ".");
}

/**
 * Get all descendants of a task
 */
export function getDescendants(tasks: ProjectTask[], parentHierarchy: string): ProjectTask[] {
  return tasks.filter(task =>
    task.hierarchy_number && isChildOf(task.hierarchy_number, parentHierarchy)
  );
}
