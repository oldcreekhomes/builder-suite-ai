

# Fix: Add `confirmed` Field to Task Update Mutation

## Problem

The right-click color picker calls `onTaskUpdate(task.id, { confirmed: true })`, but the mutation in `useTaskMutations.tsx` doesn't include `confirmed` in its update logic. The console logs show:

```
📤 Sending mutation with data: { "id": "...", "suppressInvalidate": true, ... }
🔧 Update data being sent to database: {}  ← Empty! "confirmed" is ignored
```

## Root Cause

In `useTaskMutations.tsx` lines 301-312, the code builds `updateData` by explicitly checking for each allowed field. The `confirmed` field is missing from both:
1. The `UpdateTaskParams` interface (line 37-48)
2. The `updateData` builder logic (line 301-312)

## Fix

### File: `src/hooks/useTaskMutations.tsx`

**Change 1** - Add `confirmed` to the `UpdateTaskParams` interface (around line 37):

```typescript
interface UpdateTaskParams {
  id: string;
  task_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  progress?: number;
  predecessor?: string[] | string;
  resources?: string;
  hierarchy_number?: string;
  notes?: string;
  confirmed?: boolean | null;  // ADD THIS LINE
  suppressInvalidate?: boolean;
  skipCascade?: boolean;
  _originalStartDate?: string;
  _originalEndDate?: string;
}
```

**Change 2** - Add `confirmed` to the updateData builder (around line 312):

```typescript
if (params.notes !== undefined) updateData.notes = params.notes;
if (params.confirmed !== undefined) updateData.confirmed = params.confirmed;  // ADD THIS LINE
```

## Result

- Right-clicking a Gantt bar and selecting a color will now properly update the `confirmed` field in the database
- The bar color will immediately change to reflect the selected color (Blue/Green/Red)
- No other changes needed - the existing color logic already uses `confirmed` to determine bar colors

