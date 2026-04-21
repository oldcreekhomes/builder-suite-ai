

## Why it was working before, and why it broke now

You are right to question this.

The upload was working before because the old storage policy had this simple rule:

```sql
pending/<current_user_id>/<file>
```

If Matt uploaded to:

```text
pending/2653aba8-d154-4301-99bf-77d559492e19/file.pdf
```

Matt could immediately read/delete that file because the folder matched his user ID.

When I changed the pending file access so all Old Creek employees could open each other’s uploaded bill PDFs, I removed the old per-uploader read/delete policies and replaced them with company-wide policies that look up the matching row in:

```text
pending_bill_uploads
```

That fixed the “Matt cannot open JOle’s PDF” problem after the upload row exists.

But the upload flow works in this order:

```text
1. Upload PDF to Supabase Storage
2. Then insert the pending_bill_uploads database row
3. Then AI extraction starts
```

So during step 1, there is no `pending_bill_uploads` row yet.

That means the new company-wide policy cannot find the upload record yet, and Supabase Storage blocks the upload with an RLS error.

So the issue is not the AI extraction. It is not the project. It is not the file. It is the storage policy being too strict during the first few milliseconds before the database row exists.

## What should have happened

The policy needed to support both phases:

```text
Before pending_bill_uploads row exists:
  allow the uploader to access their own temporary pending folder

After pending_bill_uploads row exists:
  allow all confirmed employees in the same company/home builder
```

I changed the second part but removed the first part too aggressively.

## Immediate fix

Restore the “uploader can access their own pending folder” bootstrap policy, while keeping the company-wide Old Creek employee access policy.

This means:

### Keep this rule for new uploads

```sql
(storage.foldername(name))[2] = auth.uid()::text
```

That allows the current logged-in user to upload/read/delete their own temporary pending file before the app has inserted the `pending_bill_uploads` row.

### Keep this rule for shared company access

```sql
pending_bill_uploads.owner_id = current user
OR pending_bill_uploads.owner_id = current user's home_builder_id
```

That allows Matt and JOle to open each other’s pending bill PDFs after the upload record exists.

## Database change

Create a migration that re-adds the two old bootstrap policies for `bill-attachments/pending/*`:

```sql
DROP POLICY IF EXISTS "Users can read from their pending folder" ON storage.objects;

CREATE POLICY "Users can read from their pending folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete from their pending folder" ON storage.objects;

CREATE POLICY "Users can delete from their pending folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

The existing policies remain:

- `Users can upload to their pending folder`
- `Pending bill files viewable by tenant`
- `Pending bill files deletable by tenant`
- `Pending bill files updatable by tenant`

Postgres combines permissive policies with `OR`, so this gives the exact intended behavior:

```text
Brand-new upload:
  uploader can access pending/<their user id>/<file>

After DB row exists:
  all confirmed company employees can access the pending bill PDF
```

## Why this does not violate your rule

This does not put Manage Bills permissions into RLS.

RLS still only handles the hard storage boundary:

- users can bootstrap their own upload path
- confirmed employees in the same company can access company bill files
- other companies cannot access those files

Employee access remains controlled in the Employee tab / app layer.

## Verification after the migration

1. Matt uploads `Invoice_C26019.pdf` in Enter with AI.
2. Storage upload succeeds.
3. `pending_bill_uploads` row inserts successfully.
4. AI extraction starts.
5. Matt can preview/download the pending PDF.
6. JOle can preview/download the same pending PDF if she has app-level access to Manage Bills.
7. JOle uploads a bill and Matt can open it.
8. A different company cannot access Old Creek bill PDFs.

## Files/areas changed

1. New Supabase migration only.
2. No frontend code change expected.

