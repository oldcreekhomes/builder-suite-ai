

## Fix Gantt Chart DST Off-By-One Bug

### Problem
Task 8.14 Drywall's Gantt bar is 1 day short because the date range crosses DST spring-forward (March 8, 2026). The 23-hour day causes `Math.floor` to lose a day.

### Fix
**File: `src/utils/dateOnly.ts`, line 142**

Change one word:
```text
Before: const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
After:  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
```

`Math.round` absorbs the +/- 1 hour from DST transitions and always returns the correct calendar day count. This fixes all tasks spanning any DST boundary, present and future.

One line, one word. Done.
