## Goal
Sort the PO Status Summary dialog rows by cost code number (ascending), instead of the current order (which follows `bill.bill_lines` array order).

## Change (single file: `src/components/bills/BillPOSummaryDialog.tsx`)

Before the `billLines.map(...)` render loop (around line 236), build a sorted copy of `billLines`:

- Extract the leading numeric portion of each line's `cost_code_display` (e.g. `"4200: Excavation, Backfill & Grading"` → `4200`, `"4275: Concrete"` → `4275`).
- Use the existing `costCodeSort` helper at `src/lib/costCodeSort.ts` if it provides a comparator; otherwise sort with a simple `localeCompare(..., undefined, { numeric: true })` on the cost code string.
- Lines without a cost code sort to the bottom.
- Stable sort so duplicate cost codes preserve their original relative order (which keeps repeated POs grouped naturally as in the screenshot).

Render uses the sorted array; totals math is unchanged (still sums all lines).

## Out of scope
- No changes to PODetailsDialog, math, totals, or any other table.
- No DB or schema changes.
