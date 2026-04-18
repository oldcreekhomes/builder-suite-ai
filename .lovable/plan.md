

## Issues

1. **Initial flash of wrong allocation** — Dialog renders before `useVendorPurchaseOrders` finishes loading the non-approved POs (via the new `includePoIds` path). With no PO records, `po_reference` resolution fails and ambiguous 4400 lines drop to $0. Once the secondary fetch completes, it re-renders correctly.

2. **Per-PO status in dialog shows "over"** — Likely because the per-line `getThisBillAmount()` returns 0 during the loading window OR the status math is using stale/zero allocations. Need to verify in `BillPOSummaryDialog.tsx`.

3. **Table-level aggregate status** — Currently shows "over" when any line is over. Need a mixed-state label.

## Investigation needed
- Confirm loading-state handling in `BillPOSummaryDialog.tsx` and `PODetailsDialog.tsx`.
- Locate the table-level status badge (`BatchBillReviewTable.tsx` row badge) and confirm how it aggregates per-PO statuses.
- Confirm `POStatus` enum values to add `"numerous"` / `"mixed"`.

## Implementation plan

### 1. Fix initial flash (dialog)
In `BillPOSummaryDialog.tsx`:
- Pull `isLoading` from `useVendorPurchaseOrders`.
- While loading (or while `includePoIds` are still missing from `vendorPOs`), show a small skeleton/spinner instead of the table.
- Apply same gating in `PODetailsDialog.tsx` so the drill-down doesn't flash either.

This guarantees the user never sees the pre-fetch (approved-only) allocation.

### 2. Fix per-PO "over" status in dialog
In `BillPOSummaryDialog.tsx`:
- Ensure the per-row status badge is computed from the **resolved** `getThisBillAmount(poId)` using the same `resolveLineToPoId` chain (line_id → po_id → po_reference → unique cost code).
- Re-derive each row's status only after PO data is loaded:
  - `thisBill + total_billed > po_amount` → `over_po`
  - `thisBill + total_billed === po_amount` → `matched`
  - `thisBill > 0 && < po_amount` → `draw`
- Verify the cent-precise comparison uses `Math.round(x * 100)` to avoid drift.

### 3. Add aggregate "Numerous" status to table row
In `POStatusBadge.tsx` and the table row badge in `BatchBillReviewTable.tsx`:
- Extend `POStatus` with `'numerous'` (label: "Numerous", neutral/amber styling).
- Aggregation rule for the row badge:
  - All matched POs share same status → use that status.
  - Mixed statuses across POs (e.g., one `matched` + one `over_po`) → `'numerous'`.
- Apply the same aggregation in `usePendingBillPOStatus.ts` if it computes the table badge.

### Files to update
- `src/components/bills/BillPOSummaryDialog.tsx`
- `src/components/bills/PODetailsDialog.tsx`
- `src/components/bills/POStatusBadge.tsx`
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/hooks/usePendingBillPOStatus.ts` (if it drives the row badge)

## Verification
- Open bill C26019 dialog cold: no flash, allocations correct from frame 1.
- Each PO row in dialog shows `Matched` (not `Over`).
- Table row badge for C26019 shows `Matched` (single consistent status).
- Construct a test bill where one PO is matched and another is over → row badge shows `Numerous`.
- Refresh and reopen — same results.

