

## Standardize All Bill Tab Tables: Uniform Headers and 3-Dot Actions

### Problem

The Manage Bills page has inconsistent table styling and action patterns across its tabs:
- **Approved tab** (`PayBillsTable`): Custom header styles (`h-8 px-2 py-1 text-xs font-medium`) that differ from the default `TableHead` component. Inline "Pay Bill" button and trash icon instead of 3-dot menu.
- **Paid tab** (`BillsApprovalTable`): Inline trash icon/lock instead of 3-dot menu. Header says "Delete" instead of "Actions".
- **Review tab** (`BillsReviewTableRow`): Inline Edit/Approve/Reject/Delete buttons instead of 3-dot menu. Header says "Actions" but is right-aligned.
- **Rejected tab**: Already converted to 3-dot menu (done).
- **NRAI tab**: Already uses 3-dot menu (done).

### Changes

#### File 1: `src/components/bills/PayBillsTable.tsx` (Approved tab)

1. **Import `TableRowActions`** from `@/components/ui/table-row-actions`.
2. **Remove custom header styles**: Strip all `h-8 px-2 py-1 text-xs font-medium` overrides from every `TableHead` so the default shadcn/ui styles (`h-10 px-2 text-foreground font-medium`) apply uniformly.
3. **Rename and center Actions header**: Change the last `TableHead` from `w-28` with left-aligned "Actions" to `text-center` with "Actions".
4. **Replace inline buttons with `TableRowActions`**: Replace the inline Pay Bill button, Edit icon, and Delete trash icon with a single centered 3-dot `TableRowActions` containing:
   - "Edit" action (opens edit dialog)
   - "Pay Bill" action (opens pay dialog)
   - "Delete Bill" (destructive, with confirmation, respects `isDateLocked`)
5. **Remove `showEditButton` prop usage** since Edit will always be in the 3-dot menu.

#### File 2: `src/components/bills/BillsApprovalTable.tsx` (Paid + Rejected + NRAI tabs)

1. **Paid tab actions**: Convert the `canShowDeleteButton` column (lines 970-1013) for the non-`showEditButton` path (Paid tab) from inline Delete trash icon to a `TableRowActions` 3-dot menu containing:
   - "Edit" action (opens edit dialog)
   - "Delete Bill" (destructive, with confirmation, respects `isDateLocked` and `reconciled`)
2. **Rename header**: Change "Delete" to "Actions" for the `canShowDeleteButton` header (line 711), and ensure `text-center` is applied.
3. **Remove `showPayBillButton` prop and column**: Since Pay Bill is now inside the 3-dot menu for the Approved tab, the separate Pay Bill column is no longer needed on `BillsApprovalTable`. (This column was only used when `showPayBillButton=true`, which is no longer passed.)

#### File 3: `src/components/bills/BillsReviewTableRow.tsx` (Review tab)

1. **Import `TableRowActions`** from `@/components/ui/table-row-actions`.
2. **Replace inline buttons**: Replace the inline Edit (pencil), Approve, Reject, and Delete buttons with a single centered 3-dot `TableRowActions` containing:
   - "Edit" action (opens edit dialog, only when status is `completed` or `reviewing`)
   - "Approve" action (opens approve dialog, only when status is `reviewing`)
   - "Reject" action (destructive, opens reject dialog, only when status is `reviewing`)
   - "Delete" action (destructive, with confirmation)
3. **Center the cell**: Change from `text-right` to `text-center`.

#### File 4: `src/components/bills/BillsReviewTable.tsx` (Review tab header)

1. **Center the Actions header**: Change `text-center` is already there, confirm it matches the standard.

### Result

Every tab (NRAI, Review, Rejected, Approved, Paid) will have:
- Identical `TableHead` default styles (no custom overrides)
- A centered "Actions" column header
- A centered 3-dot `TableRowActions` dropdown with all relevant actions
- Consistent row heights across all tabs

