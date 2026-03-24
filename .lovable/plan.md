

## Schedule Module Complexity Audit

### The Core Problem

Your schedule module has **~4,500 lines of code** spread across **25+ files** for what is fundamentally a task list with hierarchy numbers and dates. The complexity comes from every operation (add, delete, reorder, indent, outdent) needing to:

1. Recalculate hierarchy numbers for all affected tasks
2. Remap all predecessor references that point to changed hierarchy numbers
3. Normalize the hierarchy to fill gaps
4. Recalculate parent task dates from children
5. Cascade date changes to dependent tasks
6. Handle optimistic UI updates + rollback on failure
7. Manage real-time subscription conflicts

Every one of these steps has independently caused bugs. Here is what can be simplified or removed.

---

### Complexity Sources Ranked by Bug Risk

#### 1. DUPLICATE LOGIC: Three separate predecessor remapping implementations
There are **three different** `remapPredecessors` functions:
- `src/utils/deleteTaskLogic.ts` — handles delete predecessor remapping with self-reference prevention
- `src/utils/dragDropLogic.ts` — has its own `remapPredecessorString` + `remapPredecessors`
- `src/utils/addAboveLogic.ts` and `addBelowLogic.ts` — each have their own `calculatePredecessorUpdates`
- `src/utils/outdentLogic.ts` — has inline predecessor remapping logic

**Risk**: Each implementation handles edge cases differently. Some handle link types (FS/SS/SF/FF), some don't. Some handle lag days, some don't. This is why predecessor references break unpredictably.

**Fix**: Create ONE shared `remapAllPredecessors(tasks, hierarchyMapping, deletedHierarchies?)` function and use it everywhere.

#### 2. DUPLICATE LOGIC: Parent date recalculation in two places
- `useTaskMutations.tsx` has `updateParentDates` (lines 48-125) — walks up hierarchy, updates parents
- `useTaskHierarchy.ts` has `recalculateParentHierarchy` (lines 49-107) — does the same thing differently
- `taskCalculations.ts` has `calculateParentTaskValues` — the actual math
- `scheduleRecalculation.ts` has its own parent recalculation pass

**Risk**: Race conditions when both fire. Different calculations (one uses descendants, one uses direct children in different code paths).

**Fix**: Keep only ONE parent recalculation path. Remove `recalculateParentHierarchy` from `useTaskHierarchy` and rely solely on `updateParentDates` in `useTaskMutations`.

#### 3. OVER-ENGINEERING: 5-phase delete pipeline
`useTaskDelete.ts` (698 lines) has a 5-phase pipeline for deleting a single task:
- Phase 1: Bulk delete
- Phase 2: Hierarchy renumber
- Phase 3: Predecessor cleanup
- Phase 4: Normalization (calls `hierarchyNormalization.ts`)
- Phase 5: Parent recalculation

Bulk delete repeats the same 5 phases. The confirm-with-dependencies dialog adds another layer.

**Risk**: Any phase failure leaves the schedule in an inconsistent state. Phase 4 (normalization) re-runs hierarchy updates that Phase 2 already did, doubling the database calls.

**Fix**: Phase 4 (normalization) is redundant if Phase 2 does its job correctly. `computeDeleteChildUpdates` and `computeDeleteGroupUpdates` in `deleteTaskLogic.ts` already produce gap-free hierarchy numbers. Remove the normalization phase entirely from delete operations.

#### 4. NEAR-IDENTICAL CODE: handleAddAbove and handleAddBelow
`useTaskAdd.ts` has `handleAddAbove` (170 lines) and `handleAddBelow` (170 lines) that are ~90% identical. Both:
- Capture state for undo
- Create optimistic task
- Update cache
- Call bulkUpdateHierarchies
- Call bulkUpdatePredecessors
- Create the real task
- Replace optimistic with real
- Invalidate queries

**Fix**: Extract a shared `handleAddTask(position: 'above' | 'below', relativeTaskId)` function. The only difference is which util function calculates the new hierarchy.

#### 5. OVER-ENGINEERING: Auto-fix on page load
`CustomGanttChart.tsx` lines 80-96 run `recalculateAllTaskDates` on every page load. This:
- Queries all tasks
- Topologically sorts them
- Recalculates every predecessor-driven date
- Updates the database

**Risk**: Silently changes task dates the user set manually. Masks bugs by "fixing" them on reload rather than preventing them. Adds load time.

**Fix**: Remove auto-fix on load. If dates are wrong, fix the operation that caused them to be wrong, don't band-aid on reload.

#### 6. UNNECESSARY: `window.__batchOperationInProgress` flags
Multiple places set `(window as any).__batchOperationInProgress = true` and `__batchOperationCooldownUntil`. These were workarounds for real-time subscription conflicts that should no longer exist after the simplified real-time approach.

**Fix**: Remove all `window.__batchOperationInProgress` and `__batchOperationCooldownUntil` references. The simplified real-time subscription in `useProjectTasks` already handles this correctly.

#### 7. UNNECESSARY: Edge function fallback in bulkUpdateHierarchies
`useTaskBulkMutations.ts` lines 74-93 try an edge function for >10 updates, then fall back to the RPC. The RPC now handles collision-safe updates. The edge function is a redundant code path that can fail independently.

**Fix**: Remove the edge function fallback. Always use the RPC. Delete `supabase/functions/bulk-update-hierarchies/`.

#### 8. OVER-ENGINEERING: `useScheduleRowHeight` hook
This is a hook that returns a hardcoded number (40). It's imported in 2 files.

**Fix**: Replace with a constant: `const ROW_HEIGHT = 40`.

---

### Recommended Simplification Plan (Ordered by Impact)

| Priority | Change | Lines Saved | Bug Risk Reduced |
|----------|--------|-------------|------------------|
| 1 | Unify predecessor remapping into one shared function | ~150 | High |
| 2 | Remove Phase 4 (normalization) from delete pipeline | ~80 | High |
| 3 | Remove auto-fix on page load | ~20 | Medium |
| 4 | Merge handleAddAbove/handleAddBelow into one function | ~150 | Medium |
| 5 | Remove window batch operation flags | ~20 | Low |
| 6 | Remove edge function fallback, always use RPC | ~30 | Medium |
| 7 | Unify parent recalculation into one path | ~60 | High |
| 8 | Replace useScheduleRowHeight hook with constant | ~10 | None |

**Estimated total**: ~520 lines removed, 3-4 major bug vectors eliminated.

### What NOT to Remove

These are complex but necessary:
- **Predecessor validation** (`predecessorValidation.ts`) — circular dependency detection, self-reference prevention
- **Business day calculations** (`dateOnly.ts`) — DST-safe date math
- **Undo system** (`useScheduleUndo.ts`) — clean, well-isolated, works
- **Drag-drop logic** (`dragDropLogic.ts`) — core feature, but should use the shared predecessor remapping
- **Publish schedule** (`usePublishSchedule.ts`) — independent feature, doesn't interact with hierarchy logic
- **Copy schedule** (`useCopySchedule.ts`) — independent feature

