

## Plan: Left-align PO table headers in Budget Details

In `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`, update the table headers so all are left-aligned except Actions (left untouched).

### Changes
- `PO Number` — already left-aligned (default), no change.
- `Vendor` — already left-aligned, no change.
- `Status` — change `text-center` → `text-left` on header and cell.
- `Amount` — change `text-right` → `text-left` on header and cell.
- `Files` — change `text-center` → `text-left` on header and cell.
- `Actions` — leave as-is (`text-center w-16`).

### Out of scope
Other tabs, Allocation Mode panel, Total Budget footer, Actions column.

### Validation
PO tab in Budget Details shows PO Number, Vendor, Status, Amount, Files all left-aligned; Actions header and 3-dot button remain centered.

