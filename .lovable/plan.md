

Swap the order of the "Status" and "Files" columns in `BillPOSummaryDialog.tsx` so Files comes before Status, and Status sits on the far right.

### Change
In `src/components/bills/BillPOSummaryDialog.tsx`:
- In `<TableHeader>`: reorder headers to `... Remaining, Files, Status`.
- In `<TableBody>` row: reorder cells to render the `FilesCell` before the status badge cell.

### Verification
- Open PO Status Summary for bill C26019.
- Column order is: PO Number, Cost Code, PO Amount, Billed to Date, This Bill, Remaining, Files, Status.
- File icons render in the Files column; status badge is the last column.

