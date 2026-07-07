## What's broken

The Journal Entry attachment list is showing "phantom" rows created by a buggy optimistic update in `src/hooks/useJournalEntryAttachments.ts` (lines 96–112). After every upload, that block injects fabricated rows into the React Query cache with:

- a **random UUID** that does not exist in the `journal_entry_attachments` table, and
- a **fabricated `file_path`** (a fresh `Date.now()` different from the real upload path).

So when you click the red X on one of those rows:

1. `deleteFile` runs `select file_path ... where id = <fake uuid> .single()` → returns no row → throws "Attachment not found".
2. The catch block shows the red **"Failed to delete file"** toast you're seeing.

Real, freshly-refetched attachments delete just fine — but the fake ones from the optimistic block never can, and they're the ones sitting at the top of your list right now.

Nothing on the server changed. This bug has been latent since the optimistic block was added; it only bites once you actually try to delete an attachment from a JE you just uploaded to (or after a refresh that still shows a leftover phantom).

## Fix

In `src/hooks/useJournalEntryAttachments.ts`:

1. **Remove the fake optimistic `setQueryData` block** (lines 96–112). Replace it with a single `queryClient.invalidateQueries({ queryKey: ['journal-entry-attachments', journalEntryId] })` after the upload loop so the list refetches real rows with real IDs and real paths.
2. **Harden `deleteFile`** so storage-side "object not found" doesn't block DB deletion:
   - If the DB row lookup returns nothing, just remove it from the cache and show success (nothing to delete).
   - If `storage.remove` errors with a not-found style message, log it and still proceed to delete the DB row. That way any existing phantom rows and any orphaned rows can be cleared out.
3. After the fix, reload the JE dialog; the phantom row should disappear on refetch, and the remaining real attachment will delete normally.

No DB, RLS, storage-bucket, or UI-component changes required — this is a single-file hook fix.

## Verification

- Open the same JE (Closing Acquisition, 03/20/2026).
- Confirm the attachment list now shows only real rows.
- Click the red X on the attachment that wouldn't delete — it should remove without the red toast.
- Upload a new file, then delete it in the same session — should also work now that we invalidate instead of injecting fake rows.
