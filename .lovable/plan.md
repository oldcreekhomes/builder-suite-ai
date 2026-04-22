

## Show one row per bill line in the PO Status Summary

### Problem
The Edit Extracted Bill dialog shows **5 line items** (4 mapped to PO `2025-115E-0006` for Framing Labor, 1 mapped to PO `2026-115E-0060` for Exterior Trim Labor). The PO Status Summary collapses them into **2 rows** (one per unique PO) and sums each PO's "This Bill" total. The user wants the summary to mirror the bill — one row per bill line, with descriptions, so the two views match 1:1.

### Fix

In `src/components/bills/BillPOSummaryDialog.tsx`, change the table from "one row per matched PO" to "one row per bill line", in the same order as the bill.

1. **Subtitle** (line 187-189): change `"… ${matches.length} matched POs"` to `"… ${billLines.length} line items across ${matches.length} POs"`.
2. **Add a Description column** between Cost Code and PO Amount, so each row shows the line memo from the bill.
3. **Render rows from `bill.bill_lines`** (not from `matches`):
   - For each bill line, call `resolveLineToPoId(line)` to find the matched PO.
   - Pull PO Number, Cost Code, PO Amount, Billed to Date, Files from the resolved PO (via `vendorPOs` and the `match` for that PO).
   - **This Bill** = that single line's `amount` (no longer a sum across lines).
   - **Remaining** = `po_amount − total_billed − sumOfAllThisBillLinesAllocatedToThisPO` (so the remaining stays consistent at the PO level — every line allocated to the same PO will display the same Remaining value, which is correct). Alternative: show remaining only on the first row for each PO and blank on subsequent rows. **Going with the first option** (repeat the same Remaining/Billed-to-Date on each line) for simplicity and so each row is self-contained.
   - **Status** (per row): cent-precise based on the PO's projected billed total (same formula as today, but evaluated per PO and shown on each line).
   - Lines with **no resolved PO** still render with PO Number = "—", Cost Code from the line, PO Amount/Billed/Remaining = "—", This Bill = line amount, Status = "No PO" (gray badge).
4. **Single-PO shortcut** (lines 142-167): keep current behavior — if `matches.length === 1`, still open `PODetailsDialog` directly. No change.
5. **Sort order**: preserve bill-line order (don't sort by PO number anymore), so the summary visually mirrors the Edit Extracted Bill dialog top-to-bottom.

### Files touched
- `src/components/bills/BillPOSummaryDialog.tsx` only. No changes to `useBillPOMatching`, `PODetailsDialog`, DB, or other tabs.

### Verification
- Bill INV0025 PO Status Summary shows **5 rows** (4 Framing Labor + 1 Exterior Trim Labor), matching the Edit Extracted Bill dialog 1:1, each with its own description and amount.
- Sum of "This Bill" column equals the bill total ($5,200).
- Each Framing Labor row displays the same PO Amount / Billed to Date / Remaining (since they share PO 2025-115E-0006).
- The Exterior Trim Labor row stands alone for PO 2026-115E-0060.
- Single-PO bills still go straight to `PODetailsDialog` (unchanged).
- A bill line with no matched PO shows as a "—" row with "No PO" status.

