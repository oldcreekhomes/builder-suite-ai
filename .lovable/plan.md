

## Standardize Closing Reports Actions to Dropdown Menu

### Problem
The Closing Reports dialog uses inline icon buttons (Download, Edit, Delete) instead of the standardized "..." dropdown menu used everywhere else in the app.

### Fix

**File: `src/components/accounting/ClosingReportsDialog.tsx`**

1. Import `TableRowActions` from `@/components/ui/table-row-actions`
2. Remove imports for `Download`, `Pencil`, and `DeleteButton` (no longer needed inline)
3. Change the Actions `TableHead` to use `text-center`
4. Replace the inline buttons block with a single `TableRowActions` component containing:
   - "Download" action
   - "Rename" action (triggers the edit dialog)
   - "Delete" action (destructive, with confirmation)
5. Move `onClick` row-click handling so the dropdown doesn't conflict

### Result
The Actions column will show a centered "..." button that opens a dropdown with Download, Rename, and Delete -- matching the Purchase Orders table and all other tables in the app.

### Files Changed
| File | Change |
|------|--------|
| `src/components/accounting/ClosingReportsDialog.tsx` | Replace inline action buttons with `TableRowActions` dropdown |

