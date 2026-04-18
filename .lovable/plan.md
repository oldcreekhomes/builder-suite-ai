
Fix the regression in three places so pending bill PDFs work again for everyone in the company.

1. Frontend path bug
- Update `src/components/bills/BillsReviewTableRow.tsx`
- It is currently opening the preview with `bill.file_name` instead of `bill.file_path`
- Change the review table to always open the storage object using `bill.file_path`
- This explains why the Review screen fails while other bill attachment entry points already work

2. Private bucket preview/download bug
- Update `src/components/files/hooks/useFilePreview.ts`
- `bill-attachments` is a private bucket, but the hook falls back to `getPublicUrl(...)`
- That fallback creates the broken `/object/public/bill-attachments/...` URL and causes the fake “Bucket not found” error
- Remove public-URL fallback for private buckets
- For `bill-attachments`, use only:
  - direct `download()` blob for PDFs and downloads
  - signed URL only if needed
- If access fails, show the real storage/access error instead of pretending the download started

3. Storage RLS regression
- Create a Supabase migration to replace the old pending-folder storage rule introduced in `20251003013943_aca87b10-a144-43a7-a2d1-9a619c04c470.sql`
- That policy only allows `pending/{auth.uid}/...`, which breaks shared company access
- Replace it with company-aware `storage.objects` SELECT/DELETE rules for `bill-attachments` pending files
- Access rule should follow your standing requirement:
  - owner can access
  - confirmed employee/accountant in the same company can access
- Match against `pending_bill_uploads.file_path = storage.objects.name`
- Use the same company pattern already used elsewhere: `owner_id = auth.uid()` or `owner_id = public.get_current_user_home_builder_id()`

4. Keep bill_attachments table access aligned
- Verify the existing `bill_attachments` table policies are still consistent with company-wide access for both:
  - approved bill attachments
  - pre-approval attachments linked by `pending_upload_id`
- If needed, tighten them to the same company model so DB row access and storage object access never disagree

5. Download behavior cleanup
- Fix the current false-positive success path in `handleDownload`
- Right now it can toast “Download started” even when the fallback URL is invalid
- Only show success after a real blob download or a valid signed/private URL path is available

6. Verify end to end
- Review tab: click the file icon on the RC Fields pending bill and confirm preview opens
- From the preview fallback state, confirm Download actually opens/saves the PDF
- Test as:
  - owner
  - company employee/accountant
- Re-test another pending bill and one approved/paid bill to ensure no regression

Root cause summary
- This is not random
- It regressed because the app now has:
  1. a wrong file reference in `BillsReviewTableRow.tsx`
  2. a bad public URL fallback for a private bucket
  3. an old uploader-only storage policy for pending files that conflicts with your company-wide access rule

Expected result
- Pending bill PDFs preview again
- Download works again
- No more fake `object/public/bill-attachments/...` URLs
- All people in the company can access all bill files, including pending ones
