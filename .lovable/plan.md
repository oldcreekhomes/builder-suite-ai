
## Issue
The preview/download failure is real, and the error message is misleading. The broken link is trying to use a public Storage URL for a **private** `bill-attachments` bucket, so Supabase returns a 404-style `"Bucket not found"` response even though the actual problem is access/path handling.

## What I found
1. **Wrong file path in Review table**
   - In `src/components/bills/BillsReviewTableRow.tsx`, the preview click is calling:
     - `openBillAttachment(bill.file_name, displayName)`
   - That is wrong. It should use `bill.file_path`.
   - So the Review page is sometimes trying to preview using a filename instead of the storage object path.

2. **Bad fallback for private bill attachments**
   - In `src/components/files/hooks/useFilePreview.ts`, if blob download / signed URL fails, it falls back to:
     - `getPublicUrl(file.path)`
   - But `bill-attachments` is a **private bucket** (`public = false` in migration).
   - That creates the exact bad link you pasted:
     - `/storage/v1/object/public/bill-attachments/...`
   - For private bill files, this fallback should never be used.

3. **Pending upload access is too strict for team workflows**
   - Pending bill uploads are stored under:
     - `pending/{uploaderUserId}/...`
   - Storage RLS currently allows reading only when folder user id equals `auth.uid()`.
   - But your app intentionally lets employees/accountants work inside the shared company queue via `owner_id/home_builder_id`.
   - Result: another team member can see the pending bill row in the app, but cannot read the pending file in storage.

4. **Approved/paid bill attachments likely work differently**
   - Approved bill files use `bill_attachments` rows tied to actual bills and have broader company-based access rules.
   - The recurring failure is concentrated around **pending/review-stage files** and legacy pending upload file access.

## Root cause summary
This keeps happening because there are **two bugs at once**:
- a frontend bug passing `file_name` instead of `file_path`
- a Storage/RLS design mismatch where pending files are company-visible in the app but storage-readable only by the original uploader

That combination makes preview fail, then the fallback generates a fake-looking public URL, and then download fails too.

## Plan to fix

### 1. Fix the obvious wrong-path bug
Update `src/components/bills/BillsReviewTableRow.tsx` so preview uses:
- `openBillAttachment(bill.file_path, displayName)`
instead of `bill.file_name`.

### 2. Stop generating public URLs for private bill files
Update `src/components/files/hooks/useFilePreview.ts`:
- For `bill-attachments`, do **not** fall back to `getPublicUrl`
- Prefer:
  - direct `download()` blob for previewable files
  - `createSignedUrl()` for viewer rendering when needed
- If both fail, show the real access/storage error instead of manufacturing a broken public URL.

### 3. Fix Storage RLS for shared pending bill access
Create a Supabase migration to expand `storage.objects` SELECT/DELETE rules for `bill-attachments` pending files so authenticated users in the same company can access them when the related `pending_bill_uploads.owner_id` belongs to their company.
- Keep multi-tenant isolation intact
- Match the existing `owner_id/home_builder_id` access model already used by `pending_bill_uploads` and `pending_bill_lines`

### 4. Align pending attachment DB policies if needed
Review `bill_attachments` policies for rows with `pending_upload_id` to ensure pending multi-file attachments are also visible/deletable to the same company users, not just owners/uploader edge cases.

### 5. Verify all bill file entry points
Check and standardize all places that open bill files:
- Review table
- Batch bill review table
- Edit extracted bill dialog
- Approved/Paid bill dialogs
- Transaction detail dialog
Goal: every path should send the correct storage path and use the same preview/download behavior.

## Expected result after fix
- Opening a pending/review bill PDF should preview correctly
- If preview cannot render, Download should still work
- Company teammates should be able to open shared pending bill files, not just the original uploader
- The fake `.../object/public/bill-attachments/...` broken URL should disappear

## Technical notes
- `bill-attachments` bucket is private by design; keep it private
- Do not “fix” this by making the bucket public
- The correct fix is:
  - path correctness
  - signed/blob access
  - company-aware Storage RLS for pending files
