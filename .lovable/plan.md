# Add Grandchildren (3-Level Nesting) to Schedule

## Goal

Allow tasks to nest 3 levels deep: **Parent → Child → Grandchild**, with hierarchy numbers like `6`, `6.1`, `6.1.1`. Grandchildren roll up into their parent (child) row, which continues to roll up into the top-level group.

```text
6     Sitework               (rolls up child + grandchild dates/progress)
6.1   Building Permit        (rolls up its grandchildren)
6.1.1 Submit application
6.1.2 City review
6.1.3 Issued
6.2   Excavation
```

## What changes

### 1. Logic files (generalize 2-level → 3-level)

- **`src/utils/outdentLogic.ts`** — currently only outdents a child (`a.b`) to top level. Extend to also outdent a grandchild (`a.b.c`) to a child (`a.d`), shifting later siblings of `a.b` accordingly. Cap so top-level cannot outdent.
- **`src/utils/hierarchyUtils.ts`**
  - `generateIndentHierarchy` — already handles deeper indent, but add a **MAX_DEPTH = 3** guard so a grandchild cannot indent further.
  - `generateIndentUpdates` — sibling-shift block currently only renumbers top-level siblings. Generalize to renumber siblings at the indented task's **original depth under its original parent prefix** (works for child→grandchild promotions too).
  - `renumberTasks` — add a third pass for grandchildren that mirrors the existing parent→child pass.
  - `canIndent` — block when result would exceed depth 3.
- **`src/utils/addAboveLogic.ts` / `addBelowLogic.ts`** — add a third branch `handleAddAboveGrandchild` / `handleAddBelowGrandchild` for `a.b.c` targets. Renumber sibling grandchildren under the same `a.b.` prefix.
- **`src/utils/hierarchyNormalization.ts`** — extend depth checks to include level 3.
- **`src/utils/scheduleRecalculation.ts`** — already depth-aware via `split('.').length`; verify rollup of dates/progress traverses grandchildren up through child up through parent (two-pass bottom-up).

### 2. UI files

- **`src/components/schedule/UnifiedScheduleTable.tsx`** (line ~241 and elsewhere) — replace the `split('.').length === 2` check with a relative `depth === parentDepth + 1` check. Make the expand/collapse work at every level so `6.1` can independently expand to show `6.1.1 / 6.1.2 / 6.1.3`.
- **`src/components/schedule/TaskRow.tsx`** — already uses `split('.').length - 1` for indent; just confirm padding scales nicely at level 2 (suggest 20–24 px per level).
- **Hierarchy number column** — confirm the column is wide enough for `99.99.99` style labels; widen if needed.

### 3. Rollup behavior (confirmation)

Open `src/utils/taskCalculations.ts` and ensure the start/end/duration/progress aggregation for a parent uses **all descendants** (it likely already does via `getDescendants`). Recalculation must run bottom-up so grandchild → child → parent rolls cleanly in one pass.

## Constants

Add a single source of truth:

```ts
// src/utils/hierarchyUtils.ts
export const MAX_HIERARCHY_DEPTH = 3;
```

Used by `canIndent` and validation.

## Out of scope

- No DB schema change (still a dotted text column).
- No predecessor format change — `predecessorRemapping.ts` already handles `6.1.1` style references via its regex.
- No drag-drop rewrite — drag-drop reuses the indent/outdent/renumber primitives, so it inherits the fix.

## QA checklist after build

1. Indent a child to make a grandchild → numbers shift correctly.
2. Try to indent a grandchild → blocked (depth cap).
3. Outdent a grandchild back to child → siblings renumber.
4. Add Above / Add Below on a grandchild row → new grandchild slots in.
5. Delete a child that has grandchildren → grandchildren removed too, parent renumbers.
6. Change a grandchild's date → child and parent date ranges update.
7. Mark grandchildren progress → child + parent progress rolls up.
8. Collapse `6.1` → grandchildren hide; collapse `6` → everything under it hides.
9. Drag a grandchild to a new parent → numbers and predecessors stay valid.

## Effort

Medium: ~6 logic/UI files, mostly mechanical generalizations of existing 2-level logic + one rollup verification + a depth cap. Estimate one focused implementation pass plus the QA checklist above.
