

## Fix PO Status + Standardize Actions in Extracted Bills Table

### Problem 1: PO Status always shows "No PO"
Line 856 in `BatchBillReviewTable.tsx` hardcodes `status="no_po"`. The bill lines actually contain `purchase_order_id` from the database (set via EditExtractedBillDialog), but (a) the `PendingBillLine` interface doesn't declare it, and (b) the status is never computed from the lines.

### Problem 2: Actions use inline icon buttons instead of standardized dropdown
Lines 860-881 use inline Edit and Delete buttons instead of the `TableRowActions` component used everywhere else.

### Changes (File: `src/components/bills/BatchBillReviewTable.tsx`)

1. **Add `purchase_order_id` to the `PendingBillLine` interface** (around line 61): Add `purchase_order_id?: string;` so the field is recognized.

2. **Compute PO status from bill lines** (around line 854-857): Replace the hardcoded `status="no_po"` with logic that checks bill lines:
   - If any line has a `purchase_order_id` set, determine status as `'matched'`
   - If no lines have a PO, show `'no_po'`
   - A simple helper inline or above the return can compute this per bill

3. **Replace inline action buttons with `TableRowActions`** (lines 860-881): Import `TableRowActions` from `@/components/ui/table-row-actions` and replace the Edit/Delete buttons with the standard dropdown pattern. Add `text-center` to the Actions `TableHead` to center the dots.

4. **Update both header rows** (lines 511 and 562): Change the Actions `TableHead` to `text-center` for alignment.

5. **Remove unused `Trash2` and `Edit` imports** from lucide-react (line 6) if no longer used elsewhere in the file. `Trash2` is still used in the processing row (line 588) and file delete button (line 843), so only `Edit` can be removed.

