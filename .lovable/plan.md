

## Plan: Add "Divide by Lots" Button to Write Checks & Credit Cards

### What We're Copying
The `ManualBillEntry.tsx` already has a working Divide button (the `÷` icon from lucide-react's `Divide`) in the Action column of both Job Cost and Expense rows. When clicked, it calls `splitRowEvenly()` which replaces one row with N rows (one per lot), dividing the amount evenly with remainder-safe rounding. We'll copy this exact pattern.

### Changes

**`src/components/transactions/WriteChecksContent.tsx`**
1. Import `Divide` from lucide-react
2. Add `splitRowEvenly` function (copied from ManualBillEntry) that takes a row ID and type ('expense' | 'job_cost'), splits the row into N rows across all lots with penny-precise division
3. In both Chart of Accounts and Job Cost tab grids, add the Divide icon button in the Action column (next to Trash and +), wrapped in a Tooltip saying "Split evenly across all addresses" — only visible when `showAddressColumn` is true, disabled when the row already has a `lotId` or amount is 0

**`src/components/transactions/CreditCardsContent.tsx`**
Same changes — import `Divide`, add `splitRowEvenly`, add the button to both expense and job cost row Action columns.

### UI Details
- The Divide button uses `variant="ghost"`, `size="sm"`, `className="h-10 w-10 p-0"` to match existing action buttons
- Disabled state: when `row.lotId` is set (already assigned to a lot) or amount is 0
- On click: replaces the single row with one row per lot, shows a toast confirmation
- Only appears when the project has multiple lots (`showAddressColumn`)

### No Database Changes Required
This is purely client-side row manipulation before save. The existing save logic already handles per-row `lot_id`.

