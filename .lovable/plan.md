

## Fix PO Status Summary Dialog: Single-Line Rows with Standard Table UI

### Problem
The PO Status Summary dialog is too narrow, causing column headers ("PO Amount", "Billed to Date") and cell content to wrap onto multiple lines. It also lacks the standard `SettingsTableWrapper` used across all other tables in the application.

### Changes

**File: `src/components/bills/BillPOSummaryDialog.tsx`**

1. Widen the dialog from `max-w-2xl` to `max-w-4xl` to give columns enough room
2. Wrap the `<Table>` in a `<SettingsTableWrapper>` (the `border rounded-lg overflow-hidden` container used everywhere else)
3. Add `whitespace-nowrap` to all `<TableHead>` and `<TableCell>` elements so nothing wraps to a second line
4. Import `SettingsTableWrapper` from `@/components/ui/settings-table-wrapper`

These changes bring this dialog in line with the standardization philosophy -- same table wrapper, same single-line row height, same visual consistency as every other table in the app.

