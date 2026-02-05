
# Fix: Add `confirmed` to handleTaskUpdate in CustomGanttChart

## Problem Identified

The database shows `confirmed: null` for task 9.3 - the save is NOT happening. The console logs show `Update data being sent to database: {}` (empty object).

**Root Cause:** The `handleTaskUpdate` function in `CustomGanttChart.tsx` builds `mutationData` by explicitly checking each field, but `confirmed` is missing from this list (lines 378-425).

When you click "Red" in the context menu:
1. It calls `onTaskUpdate(task.id, { confirmed: false })` (correct)
2. `handleTaskUpdate` receives `updates = { confirmed: false }` (correct)
3. But `mutationData` never gets `confirmed` added to it (BUG)
4. Mutation is called with empty object
5. Database returns error "0 rows" because nothing to update

## Fix Required

### File: `src/components/schedule/CustomGanttChart.tsx`

Add `confirmed` handling after the `notes` check (around line 425):

```typescript
if (updates.notes !== undefined) {
  optimisticTask.notes = updates.notes;
  mutationData.notes = updates.notes;
}
// ADD THIS BLOCK:
if (updates.confirmed !== undefined) {
  optimisticTask.confirmed = updates.confirmed;
  mutationData.confirmed = updates.confirmed;
}
```

## What This Fixes

1. Right-clicking a task bar and selecting a color will now properly save to database
2. The `confirmed` field will be included in the mutation payload
3. The bar color will immediately update (optimistic) and persist after refresh

## Summary

Two changes were needed but only one was made:
1. `useTaskMutations.tsx` - Add `confirmed` to interface and updateData builder (DONE in last edit)
2. `CustomGanttChart.tsx` - Add `confirmed` to mutationData builder (MISSING - needs to be added)
