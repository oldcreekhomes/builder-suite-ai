
## Add "This Bill" total row to PO Status Summary

### Change
In `src/components/bills/BillPOSummaryDialog.tsx`, add a footer row to the table that sums the "This Bill" column across all bill lines.

- Add a `<TableFooter>` (or a final `<TableRow>`) after the existing `<TableBody>`.
- Label cell spans the columns before "This Bill" (PO Number, Cost Code, Description, PO Amount, Billed to Date) with right-aligned text **"Total"**.
- "This Bill" cell shows the sum of `line.amount` across all rendered bill lines, formatted with the standard currency format (2 fraction digits, USD), styled bold to match existing totals (consistent with `PurchaseOrdersTableFooter`).
- Remaining, Files, and Status cells in the footer row are left blank.
- No changes to data fetching, matching logic, or other components.

### Verification
- Bill INV0025 PO Status Summary shows a Total row reading **$5,200.00** under the This Bill column.
- Single-PO bills (which bypass this dialog) are unaffected.
- Bills with no matched POs still display the total of all line amounts.
