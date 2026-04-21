

## Plan: Fix "new row violates row-level security policy" when uploading to Enter with AI

### Root cause

The upload code calls:

```ts
supabase.storage.from('bill-attachments').upload(filePath, file, { upsert: true, ... })
```

`upsert: true` makes Supabase Storage perform an **upsert** on `storage.objects`. Postgres evaluates BOTH the INSERT `WITH CHECK` policy AND the UPDATE `USING` policy when planning an upsert, even if no row currently exists.

For `bill-attachments`:
- INSERT policies exist and pass (`auth.uid() IS NOT NULL` and the per-uploader pending folder rule).
- **There is no UPDATE policy for `bill-attachments` at all.**

So upsert fails with "new row violates row-level security policy for table 'objects'" — exactly what the postgres logs show:

```
new row violates row-level security policy for table "objects"
```

This was masked before because the previous workflow may not have hit the same upsert evaluation path; the recent storage policy refactor (replacing the per-user pending SELECT/DELETE with tenant-scoped ones) made the missing UPDATE policy actively block uploads under upsert semantics.

### The fix — add a tenant-scoped UPDATE policy on `storage.objects` for `bill-attachments/pending/*`

Same shape as the SELECT/DELETE tenant policies we just added. This keeps the rule consistent: any confirmed Old Creek user can write to Old Creek pending bill files; nobody from another builder can.

```sql
CREATE POLICY "Pending bill files updatable by tenant"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (
    -- New uploads (no matching pending_bill_uploads row yet) — allow if path is in user's own folder
    (storage.foldername(name))[2] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pu
      WHERE pu.file_path = storage.objects.name
        AND (
          pu.owner_id = auth.uid()
          OR pu.owner_id IN (
            SELECT u.home_builder_id FROM public.users u
            WHERE u.id = auth.uid() AND u.confirmed = true AND u.home_builder_id IS NOT NULL
          )
        )
    )
  )
)
WITH CHECK (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (
    (storage.foldername(name))[2] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pu
      WHERE pu.file_path = storage.objects.name
        AND (
          pu.owner_id = auth.uid()
          OR pu.owner_id IN (
            SELECT u.home_builder_id FROM public.users u
            WHERE u.id = auth.uid() AND u.confirmed = true AND u.home_builder_id IS NOT NULL
          )
        )
    )
  )
);
```

The `(storage.foldername(name))[2] = auth.uid()::text` branch handles the brand-new-upload case where there is no `pending_bill_uploads` row yet (the upload happens before the DB insert). The tenant branch covers the case where a co-tenant overwrites/upserts an existing pending file.

### Why this respects the rule you set

- RLS is still tenant-only — no per-employee permission check inside RLS.
- App-level Manage Bills / Accounting permissions remain controlled in the Employee tab via `user_notification_preferences` / `ManageBillsGuard`.
- Cross-tenant access still blocked: another builder's user satisfies neither branch.

### Verification

1. Matt uploads a PDF on 923 17th Street → upload succeeds, extraction runs.
2. JOle uploads a PDF on the same project → upload succeeds.
3. Matt opens the file JOle uploaded → preview/download works (already fixed by the previous tenant SELECT policy).
4. A user from a different builder cannot upload into or read from Old Creek's `pending/` paths.

### What's safe / unchanged

- No file deletions.
- No changes to the INSERT policy (still permissive on `bill-attachments`).
- No changes to the SELECT / DELETE tenant policies just added.
- No app code changes required — the `upload(..., { upsert: true })` call already does the right thing once the missing UPDATE policy is in place.

### Files changed

1. New migration — add `"Pending bill files updatable by tenant"` UPDATE policy on `storage.objects` for `bill-attachments/pending/*`.

