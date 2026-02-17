

## Replace Inline Edit/Delete Buttons with 3-Dot Actions Menu on Rejected Tab

The rejected tab currently shows inline Edit (pencil) and Delete (trash) buttons. This needs to be replaced with the standardized 3-dot dropdown menu pattern (`TableRowActions`), and the column header renamed from "Edit" to "Actions".

### Changes

**File: `src/components/bills/BillsApprovalTable.tsx`**

1. **Column header (line 711)**: Change `'Edit'` to `'Actions'` when `showEditButton` is true.

2. **Cell content (lines 970-1003)**: When `showEditButton` is true, replace the inline Edit icon button and Delete button with a single `TableRowActions` component containing:
   - "Edit" action (opens the edit dialog)
   - "Delete Bill" action (destructive, with confirmation dialog)
   - Respect the existing `isDateLocked` and `reconciled` checks

The non-`showEditButton` paths (used by other tabs) remain unchanged.

### Technical Details

- Import `TableRowActions` from `@/components/ui/table-row-actions`
- Build the actions array conditionally based on `isDateLocked(bill.bill_date)` and `bill.reconciled`
- The 3-dot trigger will be centered in the cell, matching the standardized pattern used across all other tables
- Column width stays at `w-16`, header uses `text-center`

