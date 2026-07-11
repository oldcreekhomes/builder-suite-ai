## Change

In `src/components/accounting/BankReconciliationsDialog.tsx`, replace the three icon buttons (Download, Pencil edit, Delete trash) in the Actions column with the standard `TableRowActions` three-dot menu used across the app (same component as `PurchaseOrdersTableRowActions`).

## Details

- Import `TableRowActions` from `@/components/ui/table-row-actions`.
- Remove the `Download`, `Pencil` (and unused `DeleteButton`) imports if no longer used.
- Render a single `TableRowActions` per row with three options:
  1. **Download** → calls existing `handleDownload(storage_path, filename)`.
  2. **Edit** → calls existing `handleEdit(id, original_filename || filename)`.
  3. **Delete** → destructive, `requiresConfirmation: true`, confirm title "Delete Bank Reconciliation", triggers `deleteMutation.mutate(id)`.
- Keep the "Actions" header centered; the cell will now contain the standard ⋯ menu button matching the rest of the app.

No other files change.