

## Fix: Replace Icon Buttons with TableRowActions Dropdown in Companies and Representatives Tables

### Problem
Both the Companies and Representatives tables still use inline icon buttons (Edit, Archive/Delete) in the Actions column instead of the standardized `TableRowActions` dropdown (three-dot menu) used across all other tables.

### Changes

**1. `src/components/companies/CompaniesTable.tsx`**
- Import `TableRowActions` from `@/components/ui/table-row-actions`
- Remove `Edit`, `Archive` icon imports (keep `Users`, `Hash` for the cost codes/reps columns)
- Remove `Tooltip` imports (no longer needed for actions column)
- Replace the Actions cell content (lines 304-337) -- the Edit button + Archive button with tooltips -- with a single `<TableRowActions>` component containing:
  - "Edit" action (calls `setEditingCompany(company)`)
  - "Archive" action (destructive, with confirmation, calls `setArchivingCompany(company)`)
- The `ArchiveCompanyDialog` can be removed in favor of the built-in confirmation dialog from `TableRowActions`, or kept if it has custom logic (it shows rep/cost code counts). Since `ArchiveCompanyDialog` has custom content showing counts, we keep it and trigger it from the dropdown action without using `requiresConfirmation`.

**2. `src/components/representatives/RepresentativesTable.tsx`**
- Import `TableRowActions` from `@/components/ui/table-row-actions`
- Remove `Edit` icon import and `DeleteButton` import
- Replace the Actions cell content (lines 401-419) -- the Edit button + DeleteButton -- with a single `<TableRowActions>` component containing:
  - "Edit" action (calls `handleEditClick(rep)`)
  - "Delete" action (destructive, with confirmation via `requiresConfirmation: true`, calls `deleteRepMutation.mutate(rep.id)`)

### Result
Both tables will use the same three-dot dropdown pattern as every other table in the application.

