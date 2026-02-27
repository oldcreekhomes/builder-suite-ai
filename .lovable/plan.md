
## Remove the Repair Button from the Schedule Toolbar

### Why
The Repair button was a diagnostic/workaround tool for a hierarchy corruption bug. There are currently **zero corrupted tasks** in the entire database. The underlying `__TEMP__` pattern is still used internally during task reordering (two-phase swap), but that resolves automatically -- users should never need to manually trigger a repair.

### Changes

**1. `src/components/schedule/ScheduleToolbar.tsx`**
- Remove `onRepairSchedule`, `isRepairing`, and `hasCorruptedTasks` from the props interface
- Remove the destructured props
- Remove the Repair button JSX block (lines ~128-138)
- Remove the `Wrench` icon import

**2. `src/components/schedule/CustomGanttChart.tsx`**
- Remove the `isRepairing` state variable
- Remove the `hasCorruptedTasks` computed value and `hasSelfReferencingPredecessors` check (~lines 625-634)
- Remove the entire `handleRepairSchedule` function (~lines 636-695)
- Remove `onRepairSchedule`, `isRepairing`, and `hasCorruptedTasks` props from the `ScheduleToolbar` usage

### What stays
- The `repair-schedule-hierarchies` edge function stays deployed (harmless, and could be useful as an admin-only tool if ever needed)
- The `__TEMP__` hierarchy pattern in `useTaskBulkMutations.ts` and `bulk-update-hierarchies` edge function stays -- it is the two-phase reorder mechanism, not a bug

### Result
Cleaner toolbar with only the buttons users actually need: Add, Undo, Copy, Expand/Collapse, Zoom In, Zoom Out, Publish.
