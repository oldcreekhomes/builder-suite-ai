
# Fix: PO Status Not Updating After Edit Bill Save

## Problem
When a user edits a bill and changes the Purchase Order assignment, the "PO Status" badge on the Review/Approved/Paid tabs still shows the old status. The PO Comparison Dialog also shows stale data because the `bill-po-matching` query cache is not invalidated after saving.

## Root Cause
The `updateApprovedBill` and `updateBill` mutations in `src/hooks/useBills.ts` invalidate `bills`, `bills-for-approval-v3`, and `bill-approval-counts` on success, but they do **not** invalidate `bill-po-matching`. Since the PO matching query is cached separately (keyed by bill IDs), it retains stale data even after the bill lines are updated with a new `purchase_order_id`.

## Fix
Add `queryClient.invalidateQueries({ queryKey: ['bill-po-matching'] })` to the `onSuccess` handler of the `updateApprovedBill` mutation (and `updateBill` for draft bills) in `src/hooks/useBills.ts`. This ensures the PO matching data is refetched immediately after any bill edit that could change PO assignments.

## File Changed
- **`src/hooks/useBills.ts`** -- Add `bill-po-matching` invalidation to the `onSuccess` of `updateApprovedBill` (and `updateBill` if applicable)

## Technical Detail
The `useBillPOMatching` hook (in `src/hooks/useBillPOMatching.ts`) caches under the key `['bill-po-matching', ...]`. Invalidating any query starting with `['bill-po-matching']` will force a refetch when the user returns to the table view, ensuring the PO Status badge and Comparison Dialog reflect the updated PO link.
