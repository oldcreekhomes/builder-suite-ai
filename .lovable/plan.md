

## Fix Schedule Auto-Scheduling to Eliminate Gaps on Refresh

### Problem
When you refresh the Schedule page, tasks with predecessors can have incorrect gaps. For example:
- Task 7.15 ends on 03-11
- Task 7.16 (predecessor: 7.15) starts on 03-23 instead of 03-12

The current `recalculateAllTaskDates` function only fixes **violations** (tasks starting BEFORE their predecessor ends) but NOT **gaps** (tasks starting AFTER the minimum required date).

### Solution
Two key changes:
1. **Fix `scheduleRecalculation.ts`** - Change from "fix violations only" to "fix all date mismatches"
2. **Run recalculation on page load** - Auto-fix dates when the Schedule page loads, not just on manual Repair

---

### Technical Changes

#### 1. Update `recalculateAllTaskDates` logic (`src/utils/scheduleRecalculation.ts`)

**Current behavior (line 159-161):**
```typescript
// ONLY FIX VIOLATIONS: If current start is BEFORE required start, push it forward
// This preserves intentional gaps where tasks are scheduled later than minimum
if (currentStartYmd < requiredStartYmd) {
```

**New behavior:**
```typescript
// FIX ALL DATE MISMATCHES: Ensure tasks start on the exact date required by predecessors
// No gaps allowed - tasks should always start at the earliest valid date
if (currentStartYmd !== requiredStartYmd) {
```

This single change ensures both violations AND gaps are fixed.

#### 2. Update cascade logic (`src/hooks/useTaskMutations.tsx`)

Apply the same change to `cascadeToDependents` (lines 170-171):

**Current:**
```typescript
// ONLY fix violations - if current start is BEFORE required, push it
if (currentStart < requiredStart) {
```

**New:**
```typescript
// Fix all date mismatches - no gaps allowed
if (currentStart !== requiredStart) {
```

#### 3. Add auto-fix on Schedule page load (`src/components/schedule/CustomGanttChart.tsx`)

Add a `useEffect` that runs `recalculateAllTaskDates` when tasks first load:

```typescript
// Auto-fix schedule on load - ensures no gaps or violations exist
const hasRunAutoFix = useRef(false);

useEffect(() => {
  if (!isLoading && tasks.length > 0 && user && !hasRunAutoFix.current) {
    hasRunAutoFix.current = true;
    
    // Run recalculation silently on load
    (async () => {
      console.log('🔄 Auto-fixing schedule on page load...');
      const result = await recalculateAllTaskDates(projectId, tasks);
      if (result.updatedCount > 0) {
        console.log(`✅ Auto-fixed ${result.updatedCount} tasks on load`);
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, user.id] });
      }
    })();
  }
}, [isLoading, tasks.length, user, projectId, queryClient]);
```

#### 4. Reset auto-fix ref when project changes

```typescript
useEffect(() => {
  hasRunAutoFix.current = false;
}, [projectId]);
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/utils/scheduleRecalculation.ts` | Change `<` to `!==` on line 161 to fix gaps as well as violations |
| `src/hooks/useTaskMutations.tsx` | Change `<` to `!==` on line 171 in cascade logic |
| `src/components/schedule/CustomGanttChart.tsx` | Add useEffect to run auto-fix on page load |

---

### Expected Behavior After Fix

1. **On page load/refresh**: All tasks with predecessors are automatically adjusted to start on the correct date (no gaps, no violations)
2. **On any task date change**: Dependent tasks cascade immediately to maintain tight scheduling
3. **Repair button**: Still works as before, but will find fewer issues since auto-fix runs on load

### Example Fix
Before:
- 7.15: ends 03-11
- 7.16: starts 03-23 (12-day gap - WRONG)

After:
- 7.15: ends 03-11
- 7.16: starts 03-12 (next business day - CORRECT)

