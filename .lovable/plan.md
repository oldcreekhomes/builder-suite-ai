
## Fix: Multiple Attachments in Edit Extracted Bill Dialog

### The Problem

The current implementation stores only **one** file per extracted bill — a single `file_name` and `file_path` column in `pending_bill_uploads`. The file input even only reads `e.target.files?.[0]`, so clicking "Add Files" and selecting a new file replaces the previous one entirely.

### The Solution

Add a `pending_upload_id` foreign key column to `bill_attachments` so multiple attachment records can reference a single extracted bill in the queue. Then update the dialog's UI and logic to manage an array of attachments — matching exactly how the Enter Manually form works via `BillAttachmentUpload`.

### Technical Changes

**1. Database Migration**

Add a nullable `pending_upload_id` column to `bill_attachments` referencing `pending_bill_uploads.id`:

```sql
ALTER TABLE bill_attachments
  ADD COLUMN pending_upload_id uuid REFERENCES pending_bill_uploads(id) ON DELETE CASCADE;
```

This means the `bill_id` column stays nullable (it's already nullable) and gets filled in when the pending bill is approved and becomes a real bill. Existing rows are unaffected.

**2. `src/components/bills/EditExtractedBillDialog.tsx`**

Replace single-file state with a multi-file array — mirroring `BillAttachmentUpload`:

- **State**: Replace `const [fileName, setFileName] = useState<string>("")` and `const [filePath, setFilePath] = useState<string>("")` with:
  ```ts
  const [attachments, setAttachments] = useState<Array<{ id: string; file_name: string; file_path: string }>>([]);
  ```

- **On open / `useEffect`**: Instead of reading `bill.file_name` and `bill.file_path`, query `bill_attachments` where `pending_upload_id = pendingUploadId`. Fall back gracefully: if the legacy single-file fields (`bill.file_name`) are set and no rows exist yet, show that one file.

- **File upload handler** (`onChange` on the hidden input):
  - Change input to `multiple` (it already has this but only reads index 0 — fix to loop all files)
  - For each selected file: upload to `bill-attachments` bucket, then insert a row into `bill_attachments` with `pending_upload_id = pendingUploadId` and `bill_id = null`
  - Append to local `attachments` state

- **File delete handler**: Delete the row from `bill_attachments` by `id`, remove from storage, filter out of local state. Replace the current `showDeleteAttachmentConfirm` single-file confirm flow with per-attachment inline `×` buttons (same UX as `BillAttachmentUpload`).

- **UI**: The Attachments section already shows icons for each file — just map over `attachments[]` instead of checking a single `fileName` string. The `Add Files` button and hidden input stay in place.

**3. Approval flow (`SimplifiedAIBillExtraction.tsx` or wherever pending bills are approved)**

When a pending bill is approved and a real `bill_id` is created, update all `bill_attachments` rows where `pending_upload_id = pendingUploadId` to set `bill_id = newBillId` and clear `pending_upload_id`. Also clear the legacy `file_name`/`file_path` on the `pending_bill_uploads` row (or leave them as-is — they become irrelevant).

### What Stays the Same

- The 50/50 layout (Attachments | Internal Notes) in the third column — no layout changes
- The Internal Notes button, notes dialog, all line item logic
- The `bill_attachments` table columns for approved bills (`bill_id` path) — unchanged
- The `BillAttachmentUpload` component used in the Enter Manually form — unchanged
