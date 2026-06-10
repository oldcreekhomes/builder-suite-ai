## Footer row updates in `BillPOSummaryDialog.tsx`

Update only the `<TableFooter>` row (around lines 414-422):

1. **Move "Total" to far left** — under the PO Number column. Change the first cell from a right-aligned `colSpan={6}` to a left-aligned single cell with label "Total".
2. **Add PO Amount total** — sum `match.po_amount` across **distinct PO IDs** (so a PO appearing on multiple rows is only counted once). Render in the PO Amount column using the same green badge styling used by the This Bill cell (`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700`).
3. **Keep This Bill total** as-is (same green badge style applied for consistency).
4. Empty cells for Cost Code, Description, Lots, Billed to Date, Remaining, Files, Status.

No other file changes; no logic or query changes.
