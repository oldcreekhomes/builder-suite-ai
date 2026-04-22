

## Stop the auto-PO-matching effect from overwriting the user's "No PO" choice

### Root cause (verified in the live DB)

The Edit Extracted Bill dialog runs an auto-PO-matching effect (`EditExtractedBillDialog.tsx` ~lines 440–491) that:

1. Recomputes a best PO match for every job-cost line whenever `vendorPOs` OR `jobCostLines` changes.
2. Fire-and-forgets `supabase.from('pending_bill_lines').update({ purchase_order_id, purchase_order_line_id })` directly into the DB, **without writing `po_assignment`** and **without checking whether the user already explicitly chose "No purchase order"**.

For INV0022, the live rows show:

| line | cost code | purchase_order_id | po_assignment | updated_at |
|---|---|---|---|---|
| 1 Siding | 4470 | 3f63b122… (`…0003`) | NULL | 22:12:00 |
| 2 Trim | 4410 | 20c8f3ef… (`…0004`) | NULL | **22:15:36** |
| 3 Trim | 4410 | 20c8f3ef… (`…0004`) | NULL | **22:15:36** |
| 4 Tyvek | 4375 | NULL | NULL | 22:12:00 |

Lines 2/3 were updated by the auto-matcher **after** the user's save, so the previous "honor `__none__`" fix never had a chance — the saved state gets overwritten 3 minutes later by the effect re-firing. `po_assignment` is also still NULL on every row, so PO Summary's "auto-match by cost code" fallback kicks in too.

### Fix

#### 1. Make the auto-PO-matching effect respect explicit user intent
In `src/components/bills/EditExtractedBillDialog.tsx` (the effect at ~440–491):
- Skip any line whose current state is `purchase_order_id === '__none__'` OR whose persisted `po_assignment === 'none'`. Never re-match those, never write to DB for them.
- Also skip lines the user has manually touched in this session (track a `userTouchedPoLineIds` set updated by the `POSelectionDropdown` onChange).
- When the effect DOES persist a match, write `po_assignment: 'auto'` alongside the `purchase_order_id` so we can tell auto-matches from explicit ones later.
- Run the effect **once per dialog open per line**, not on every `jobCostLines` change. Use a ref-guard keyed by `pendingUploadId + lineId` so it can't loop and re-clobber.

#### 2. Make the manual save path the single source of truth
Still in `EditExtractedBillDialog.tsx`:
- In `handleSave`, for every job-cost line, ALWAYS write both `purchase_order_id` (real UUID or `null`) AND `po_assignment` (`'none' | 'auto' | null`). No more relying on the auto-matcher's separate writes.
- When `line.purchase_order_id === '__none__'`: write `purchase_order_id = null`, `po_assignment = 'none'`, `purchase_order_line_id = null`.
- When the user picked a real PO: write `po_assignment = null` (explicit user pick) and the UUID.
- When still `__auto__` / unset: leave whatever the auto-matcher wrote (`po_assignment = 'auto'`).

#### 3. Force PO Summary + matcher to honor `po_assignment = 'none'` even when `purchase_order_id` is non-null
In `src/hooks/useBillPOMatching.ts` and `src/hooks/usePendingBillPOStatus.ts`:
- Treat a line as "No PO" if EITHER `purchase_order_id === '__none__'` OR `po_assignment === 'none'`. If both flags disagree (e.g. UUID set but `po_assignment = 'none'`), trust `po_assignment`. This guarantees PO Summary won't show a PO link even if a stale UUID survives in the row.
- In `BatchBillReviewTable.tsx`, `BillsApprovalTable.tsx`, `PayBillsTable.tsx` `billsForMatching` builders: if `po_assignment === 'none'`, force `purchase_order_id = '__none__'` regardless of the stored UUID.

#### 4. Repair the existing INV0022 row
One-time SQL via migration: for `pending_bill_lines` where `pending_upload_id = '72304b79-…'` and `line_number IN (2,3)`, set `purchase_order_id = NULL`, `purchase_order_line_id = NULL`, `po_assignment = 'none'`. This unwinds the bad state on the bill currently in the user's view so they can verify the fix without re-extracting.

#### 5. Backfill `po_assignment = 'auto'` for any row the auto-matcher previously wrote without explicit user intent
Migration: where `purchase_order_id IS NOT NULL` AND `po_assignment IS NULL`, set `po_assignment = 'auto'`. This makes the new "trust po_assignment" rules behave consistently for older bills.

### Files touched
- `src/components/bills/EditExtractedBillDialog.tsx`
- `src/hooks/useBillPOMatching.ts`
- `src/hooks/usePendingBillPOStatus.ts`
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/components/bills/BillsApprovalTable.tsx`
- `src/components/bills/PayBillsTable.tsx`
- new migration: clear lines 2/3 of `72304b79-…` and backfill `po_assignment`

### Verification on INV0022
1. Reload the bill in Edit Extracted Bill: lines 2, 3, 4 already show "No purchase…" and STAY that way; lines are not re-matched on render.
2. Open PO Status Summary: only line 1 (`4470 Siding`) attached to `2025-115E-0003`; lines 2, 3, 4 show "No PO" with their saved cost codes and standard font.
3. Manually pick a real PO on line 2, save, reopen — selection persists.
4. Manually set line 2 back to "No purchase…", save, reopen — still "No PO". PO Summary matches.

