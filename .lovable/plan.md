The delete failure is not because the attachment rows are fake anymore. The live error is:

```text
StorageApiError: invalid input syntax for type uuid: "journal-entry-attachments"
```

That happens while trying to remove the file from Supabase Storage. The hook currently treats that storage cleanup error as fatal, so it stops before deleting the `journal_entry_attachments` database row. Result: the red X always shows “Delete failed” and the icons stay visible.

Plan:

1. Update `useJournalEntryAttachments.deleteFile` so deleting the attachment row from `journal_entry_attachments` is the primary operation.
   - Delete the DB row by attachment id.
   - Immediately invalidate the attachments query so the icon disappears.
   - Show success if the row is gone.

2. Make Supabase Storage cleanup non-blocking.
   - Look up the file path first if available.
   - Attempt `storage.remove(...)` only as cleanup.
   - If storage returns any error, including the current UUID/path policy error, log a warning but do not fail the user-facing delete.

3. Apply the same non-blocking cleanup behavior to pending draft attachments.
   - If storage deletion fails, still remove the pending icon from local state.

4. Keep this scoped to journal entry attachments only.
   - No reconciliation changes.
   - No database migration.
   - No broad storage policy changes in this pass.