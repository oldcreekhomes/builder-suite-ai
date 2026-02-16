

## Standardize Bank Statements Table to Match Manage Bills

### Problems Identified
1. **Row actions** use inline icon buttons (download, edit, delete) instead of the standard `TableRowActions` "..." dropdown menu
2. **Date format** uses "Jun 30, 2024" (PPP) instead of the standard "06/30/24" (MM/dd/yy) format used in Manage Bills
3. **Date parsing** uses `new Date()` instead of the project-standard `formatDateSafe` utility, risking timezone bugs
4. **Table container** doesn't use the standard `SettingsTableWrapper` component

### Changes to `src/components/accounting/BankStatementsDialog.tsx`

**1. Replace inline action buttons with `TableRowActions` dropdown**
- Remove the three separate icon buttons (Download, Edit, Delete) from each row
- Replace with a single `TableRowActions` component containing:
  - "Download" action
  - "Edit" action
  - "Delete" action (destructive, with confirmation)

**2. Fix date formatting**
- Import `formatDateSafe` from `@/utils/dateOnly`
- Statement End Date: change from `format(new Date(...), 'PPP')` ("Jun 30, 2024") to `formatDateSafe(dateStr, 'MM/dd/yy')` ("06/30/24")
- Uploaded date: change from `format(new Date(uploaded_at), 'PP')` to `formatDateSafe(uploaded_at, 'MM/dd/yy')`

**3. Use `SettingsTableWrapper`**
- Wrap the table in `SettingsTableWrapper` for consistent border/rounding
- Pass `containerClassName="relative w-full overflow-visible max-h-none"` to `Table` per dialog-table pattern

### Files Modified
- `src/components/accounting/BankStatementsDialog.tsx`

### No other files need changes
The `Table`, `TableRowActions`, `SettingsTableWrapper`, and `formatDateSafe` utilities already exist and are correct.
