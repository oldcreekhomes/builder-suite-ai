

## Clean Up PODetailsDialog Layout

Three changes to simplify the dialog and fix alignment:

### 1. Remove Summary Row (lines 132-158)
The summary row (PO Total, Billed to Date, This Bill, Remaining) duplicates the Totals row in the table. Delete it entirely since the table already shows all totals clearly.

### 2. Remove Footer (lines 278-285)
The "Current Bill: CU202508 for $11,500.00" footer repeats info already visible in the "This Bill" column header and table. Delete the `currentBillAmount` conditional block at the bottom.

### 3. Table Header Fixes
- Change "Billed" to "Billed To Date" (line 170)
- Change "This Bill" from `text-right` to `text-left` to match Cost Code and Description alignment (line 171)
- Also update the "This Bill" data cells (line 202) to `text-left` for consistency

### Technical Details

**File: `src/components/bills/PODetailsDialog.tsx`**

- Delete the summary `div` block (lines 132-158)
- Change `<TableHead className="text-xs text-right">Billed</TableHead>` to `Billed To Date`
- Change `<TableHead className="text-xs text-right">This Bill</TableHead>` to remove `text-right`
- Update `<TableCell className="text-xs text-right">` for This Bill cells to remove `text-right`
- Update the Totals row This Bill cell similarly
- Delete the `currentBillAmount` footer block (lines 278-285)
- The over-budget warning banner stays -- it serves a distinct purpose as an alert

