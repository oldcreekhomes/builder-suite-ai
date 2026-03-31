

## Fix: Slow Date Updates in Bidding

### Root Cause

Every time you pick a due date or reminder date, the mutation's `onSuccess` calls:
```ts
queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
```

This triggers a **full refetch** of ALL bidding packages with all their nested `project_bids` and `companies` joins. With 57+ draft packages, each containing multiple companies, this is a heavy query that takes several seconds to complete. The calendar popover stays open / freezes while waiting.

Additionally, there's **no optimistic update** — the UI waits for the round trip before reflecting the change.

### Fix

**1. Add optimistic updates to date mutations** (`src/hooks/useBiddingMutations.ts`)

For `updateBiddingDueDate` and `updateBiddingReminderDate`:
- Use `onMutate` to immediately update the cached bidding data with the new date value
- Store previous data for rollback on error
- Cancel any in-flight queries before mutating the cache
- On error, roll back to the previous cache state
- On success, do a background invalidation (no toast-blocking refetch)

```ts
// Pattern for both due_date and reminder_date mutations:
onMutate: async ({ itemId, dueDate }) => {
  await queryClient.cancelQueries({ queryKey: ['project-bidding', projectId] });
  const previous = queryClient.getQueryData(['project-bidding', projectId, status]);
  // Update cache in-place
  queryClient.setQueriesData({ queryKey: ['project-bidding', projectId] }, (old) => {
    return old?.map(item => item.id === itemId ? { ...item, due_date: dueDate } : item);
  });
  return { previous };
},
onError: (err, vars, context) => {
  // Rollback
  queryClient.setQueriesData({ queryKey: ['project-bidding', projectId] }, context.previous);
},
onSettled: () => {
  // Background refetch to sync
  queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
},
```

**2. Apply the same pattern to `updateBiddingStatus`** — since status changes also trigger a full refetch.

**3. Keep the toast but make it non-blocking** — toast fires in `onMutate` (optimistically) or stays in `onSuccess` but the UI update doesn't wait for it.

### Files Changed
- `src/hooks/useBiddingMutations.ts` — Add optimistic cache updates to `updateBiddingDueDate`, `updateBiddingReminderDate`, and optionally `updateBiddingStatus`

### Result
- Date picks will feel instant (< 100ms UI response)
- Data stays consistent via background refetch
- Errors roll back gracefully with an error toast

