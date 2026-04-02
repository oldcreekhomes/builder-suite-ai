

## Add Files to Budget Details PO Tab

### Problem
The Budget Details dialog's Purchase Orders tab shows a Date column that isn't needed. The PO table elsewhere shows file icons for attached documents — these should appear in the Budget Details dialog too.

### Fix
Replace the "Date" column with a "Files" column in `BudgetDetailsPurchaseOrderTab.tsx`, reusing the existing `FilesCell` component.

### Changes

**`src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`**
1. Import `FilesCell` from `@/components/purchaseOrders/components/FilesCell`
2. Remove the `date-fns` import (no longer needed)
3. In the table header: replace `<TableHead>Date</TableHead>` with `<TableHead>Files</TableHead>`
4. In the table body: replace the Date `<TableCell>` (showing `format(...)`) with a `<TableCell>` rendering `<FilesCell files={po.files} projectId={projectId} />`

No query changes needed — the `select('*')` already includes the `files` column.

### Files changed
- `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`

