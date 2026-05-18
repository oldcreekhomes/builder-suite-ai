What I see on my end:
- The database is saving correctly now: Kempsville invoice `IN48000495861` has `purchase_order_id = null` and `po_assignment = 'none'`.
- Your screenshot confirms the table can show `No PO` after a refresh.
- The remaining bug is client-side cache/query freshness: after saving in `EditBillDialog`, the table and dialog can keep rendering stale React Query data until a full page refresh forces a fresh read.

Plan:
1. Make the save mutation return the freshly saved bill with `bill_lines.po_assignment`, `purchase_order_id`, and related display fields instead of only returning the bill id.
2. On successful save, synchronously patch the cached `['bill', billId]` detail query and every active `['bills-for-approval-v3', ...]` table query containing that bill, so the row changes immediately without waiting for a refetch.
3. Explicitly remove stale `bill-po-matching` results for that bill/list and then invalidate/refetch matching queries so the PO badge recalculates from `po_assignment = 'none'`.
4. Keep the existing invalidations as a backup, but make them exact enough to avoid missing active table variants.
5. Add one shared helper for “merge updated bill into cached approval tables” so future bill edits update the table the same way.

Technical details:
- Update `src/hooks/useBills.ts` only.
- `updateBill` and `updateApprovedBill` should call a fresh bill select after saving and use `queryClient.setQueriesData` for all `bills-for-approval-v3` caches.
- This fixes the same-screen stale table problem; no database migration is needed because the DB row is already correct.