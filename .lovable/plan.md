

## Speed Up Reconciliation Transaction Updates

### Problem
All three update mutations (`updateCheckTransaction`, `updateDepositTransaction`, `updateBillPaymentTransaction`) wait for the database round-trip to complete before updating the UI. The cache patch for bill payments happens in `onSuccess` (after the DB call), and for checks/deposits there's no cache patch at all — they only invalidate, triggering a full refetch. This causes a 3-4 second delay before the user sees changes.

### Fix: Optimistic Updates
Move the cache patch to `onMutate` (before the DB call) so the UI updates instantly, and revert on error.

### Changes in `src/hooks/useBankReconciliation.ts`

**All three mutations** (`updateCheckTransaction`, `updateDepositTransaction`, `updateBillPaymentTransaction`):

1. Add `onMutate` handler that:
   - Cancels any in-flight `reconciliation-transactions` queries
   - Snapshots the current cache
   - Patches the cache immediately with the new value
   - Returns the snapshot for rollback

2. Add/update `onError` to restore the snapshot on failure

3. Move `invalidateQueries` to `onSettled` (runs after success or error) so we always re-sync with the server in the background

4. For bill payments, remove the duplicate cache patch from `onSuccess` (it will already be done in `onMutate`)

This means the UI updates in ~0ms instead of waiting 1-4 seconds for the DB round-trip.

