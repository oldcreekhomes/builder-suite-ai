
## Goal
On the **Enter with AI** tab, when hovering the cost-code cell, show every bill line as its own row in the tooltip. Today two lines that share a cost code (4400 Exterior Trim and 4400 Cornice → both shown as "4400: Exterior Trim / Cornice $6,830.00") are being merged. Stop the merge — show one row per `pending_bill_lines` row, in original order, with its own description and amount.

## Where the merge happens
The cost-code summary tooltip lives in `src/components/bills/BatchBillReviewTable.tsx` (the cell that renders "4470: Siding +1" with the hover popover). It currently aggregates lines by cost code (sum of amounts, deduped label) which is why two distinct 4400 lines collapse into one $6,830 row.

## Change
Single file: `src/components/bills/BatchBillReviewTable.tsx`

1. Replace the cost-code aggregation logic with a straight pass-through of `bill.pending_bill_lines` (or equivalent line array already on the bill object).
2. Tooltip rows = one per line, preserving original order:
   - Left: `{cost_code_number}: {cost_code_name}` — fall back to the line's `description`/`memo` when no cost code is set, then `"Uncategorized"`.
   - Right: line amount, currency-formatted (2 decimals, existing standard).
3. Trigger label in the cell stays as-is: first line's cost code + `+N` when there are more lines (N = total lines − 1, not unique cost codes − 1).
4. Total row at the bottom of the tooltip stays — it's the sum of all line amounts (already matches `bill.total_amount`).
5. No data fetching changes — `pending_bill_lines` is already loaded for this table.

## Out of scope
- Approved/Paid/Review tabs (user only asked about Enter with AI; those tabs use `bill_lines` and a separate component).
- Any matcher/extractor changes.
- Styling beyond keeping the existing popover look.

## Verification
- Hover the AN EXTERIOR INC. row cost-code cell → tooltip shows 3 rows: `4470: Siding $20,350.00`, `4400: Exterior Trim $2,800.00`, `4400: Cornice $4,030.00`, Total `$27,180.00`.
- Trigger label reads `4470: Siding +2` (3 lines − 1).
- A single-line bill still shows just one row + total, no `+N` suffix.
