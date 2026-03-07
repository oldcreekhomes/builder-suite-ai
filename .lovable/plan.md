

## Fix Edit Bill Dialog Layout Issues

### Problems
1. "Job Cost Total:" label wraps to 3 lines because it's in a `col-span-14` grid cell that's too narrow at the label's position
2. Cancel/Save buttons are in a separate `DialogFooter` below the table, wasting vertical space
3. The "Action" column is empty for approved bills (by design — delete is hidden when `isApprovedBill`) but wastes horizontal space

### Changes

**`src/components/bills/EditBillDialog.tsx`**

1. **Job Cost Total footer (lines 939-964)**: Add `whitespace-nowrap` to the label div and reduce its col-span so text stays on one line. Do the same for the Expense Total footer (lines 1064-1089).

2. **Move Cancel/Save into the footer row**: Remove the `<DialogFooter>` block (lines 1095-1102). Instead, add the Cancel and Save buttons to the right side of both the Job Cost and Expense total footer rows (inside the empty spacer div at the end of each footer grid). This puts them inline with the total in the grey `bg-muted` bar, saving a full row of vertical space.

3. **Action column for approved bills**: No change — the column header "Action" remains for consistency with edit mode. The delete button is intentionally hidden for approved bills since only date, cost code allocation, files, and notes can be modified.

### Files
1. `src/components/bills/EditBillDialog.tsx`

