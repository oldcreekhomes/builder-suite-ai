

## Speed Up Reconciliation Optimistic Updates

### Problem
The optimistic update patches the cache instantly, but `onSettled` immediately fires `invalidateQueries`, triggering a full data refetch. This large query takes 3-5 seconds, and when it completes the UI re-renders with server data, causing the visible "jump." The optimistic update is being undone and redone by the refetch.

### Fix
In `src/hooks/useBankReconciliation.ts`, for all three mutations (`updateCheckTransaction`, `updateDepositTransaction`, `updateBillPaymentTransaction`):

1. **Remove `invalidateQueries` from `onSettled`** — the optimistic cache is already correct after a successful save
2. **Move `invalidateQueries` into `onError` only** — so a failed save triggers a refetch to restore correct state
3. Keep the `onMutate` optimistic patching and `rollbackOptimistic` as-is

This eliminates the redundant 3-5 second refetch after every edit, making updates feel instant.

### Files changed
- `src/hooks/useBankReconciliation.ts` — remove `onSettled` from all three update mutations, add invalidation to `onError` block only

