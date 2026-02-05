

# Fix: Add `confirmed` Field to Task Update Mutation

## Problem Confirmed

I queried the database and task 9.3 "Add MLA" currently shows:
- `confirmed: null` (Blue/default)

The update is NOT saving because the `confirmed` field is not included in the mutation logic. The previous fix was approved but the implementation was canceled before completion.

## What Needs to Change

### File: `src/hooks/useTaskMutations.tsx`

**Change 1** - Add `confirmed` to the UpdateTaskParams interface (line 33):

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
  confirmed?: boolean | null;  // ADD THIS
  suppressInvalidate?: boolean;
  skipCascade?: boolean;
  _originalStartDate?: string;
  _originalEndDate?: string;
}
```

**Change 2** - Add `confirmed` to the updateData builder (after line 312):

```typescript
if (params.notes !== undefined) updateData.notes = params.notes;
if (params.confirmed !== undefined) updateData.confirmed = params.confirmed;  // ADD THIS
```

## Result

After this fix:
- Right-clicking a Gantt bar and selecting Green will set `confirmed = true` in the database
- The bar will immediately display as green
- Same for Red (`confirmed = false`) and Blue (`confirmed = null`)

