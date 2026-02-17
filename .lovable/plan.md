
## Fix PO Status and PO Details Dialog on Review Tab

### Problem 1: "Over" Status Is Incorrect
The `useBillPOMatching` hook calculates cumulative billing by summing ALL posted/paid bills for the same project + vendor + cost code combination. This means unrelated historical bills for the same cost code inflate the "Billed to Date" figure, pushing the remaining below zero and triggering the "Over" status -- even when the bill's own PO has plenty of budget remaining.

The root cause is in `useBillPOMatching.ts` (lines 176-186): it aggregates billing by `project_id|vendor_id|cost_code_id` without filtering to bills that are actually linked to the specific PO. Per the project memory, "Billed to Date totals strictly include transactions explicitly linked to the PO or PO line (via purchase_order_id or purchase_order_line_id)."

### Problem 2: Clicking PO Status Only Shows One PO
In `BillsApprovalTable.tsx` line 927, only `matchResult?.matches?.[0]` (the first match) is passed to the dialog. Since the bill has 3 cost codes with 3 different POs, the user should see all 3, not just siding.

The current `PODetailsDialog` only supports displaying a single PO. We need a new summary dialog that lists all matched POs for a bill.

---

### Technical Changes

**File 1: `src/hooks/useBillPOMatching.ts`**
- Update the cumulative billing calculation (lines 132-186) to only count bill lines that are explicitly linked to the PO via `purchase_order_id` or `purchase_order_line_id`.
- Add `purchase_order_id` and `purchase_order_line_id` to the `bill_lines` select query (line 143).
- Change the `billedLookup` to be keyed by PO ID instead of the composite key, summing only lines where `purchase_order_id` matches.
- For the status check (line 234), use the PO-specific billed total instead of the composite total.

**File 2: `src/components/bills/BillPOSummaryDialog.tsx` (new file)**
- Create a new dialog component that displays all matched POs for a bill in a summary table.
- Show columns: PO Number, Cost Code, PO Amount, Billed to Date, Remaining, Status.
- Each row represents one matched PO from the `matches` array.
- Color-code remaining (green = positive, red = negative).
- Allow clicking a row to drill into the existing single-PO `PODetailsDialog`.

**File 3: `src/components/bills/BillsApprovalTable.tsx`**
- Replace `PODetailsDialogWrapper` usage with the new `BillPOSummaryDialog`.
- Pass all matches (`matchResult?.matches`) instead of just the first one (line 927).
- Pass the bill reference info for context in the dialog header.
- Update the dialog state to hold the full matches array instead of a single `poMatch`.
