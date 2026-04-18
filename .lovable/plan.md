

## Goal
Remove the redundant secondary "PO details" dialog that opens when clicking a row in the PO Status Summary table. The summary already shows all the same information.

## What's happening now
In `BillPOSummaryDialog.tsx`:
- The summary table renders a row per matched PO with PO Number, Cost Code, PO Amount, Billed to Date, This Bill, Remaining, Status.
- Each row has `onClick={() => setSelectedPoId(match.po_id)}` which opens a second `<PODetailsDialog>` showing essentially the same row data (per screenshot: PO number, cost code, PO Amount, Billed to Date, This Bill, Remaining, Matched badge).
- This drill-down is redundant.

## Plan

### 1. Remove drill-down from `BillPOSummaryDialog.tsx`
- Delete `selectedPoId` state and the `selectedPO` lookup.
- Remove the `<PODetailsDialog>` instance rendered at the bottom of the component.
- Remove `onClick` and `cursor-pointer hover:bg-muted/50` from the table rows so rows are not interactive.
- Remove the `&& !selectedPoId` gate on the outer Dialog's `open` prop (just use `open`).
- Remove the now-unused `PODetailsDialog` import if no other usage remains in this file.

### 2. Preserve single-PO behavior
- The early-return path for `matches.length === 1` still uses `PODetailsDialog` directly — that is the correct single-PO view and stays unchanged.

### 3. Verify no other callers depend on the drill-down
- Confirm `PODetailsDialogWrapper` and other entry points to `PODetailsDialog` are untouched.

## Files to update
- `src/components/bills/BillPOSummaryDialog.tsx`

## Verification
- Open a bill with multiple matched POs → PO Status Summary opens.
- Clicking a row does nothing (no second dialog).
- Open a bill with a single matched PO → still goes directly to PO details (unchanged).
- No console errors; no unused imports.

