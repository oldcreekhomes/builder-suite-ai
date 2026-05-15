# Fix: Check attachments missing when reopening a check

## Root cause

In `src/components/transactions/WriteChecksContent.tsx`, `loadCheckData()` (line 462) sets all the form fields when you open an existing check, but it **never queries `check_attachments`** or calls `setAttachments(...)`. The `CheckAttachmentUpload` component just renders whatever the parent passes in — and the parent passes an empty array. So existing attachments simply never load into the UI, even though they were saved correctly to storage and to the `check_attachments` table.

(The save path at lines 840–866 does upload temp files correctly after the check is created, so the data is there — it's purely a load bug.)

## Fix

Update `loadCheckData` to fetch attachments for the loaded check and populate state:

1. Make `loadCheckData` async.
2. After `setCurrentCheckId(check.id)`, query:
   ```ts
   const { data } = await supabase
     .from('check_attachments')
     .select('id, file_name, file_path, file_size, content_type')
     .eq('check_id', check.id)
     .order('uploaded_at', { ascending: true });
   setAttachments(data ?? []);
   ```
3. Update the call sites (`handleCheckSelect`, the two `loadCheckData(filteredChecks[...])` spots around lines 202, 445, 449, 458, 545) — they don't need to await, fire-and-forget is fine.
4. Keep `setAttachments([])` reset in `createNewCheck` so switching to a new check clears the prior list.

That's it — single file, ~10 lines.
