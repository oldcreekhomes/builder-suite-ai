
## Fix: Attachment Deletion Should Only Remove the File, Not the Entire Bill

### Problem Summary

Two locations incorrectly delete the entire pending bill when the user clicks the X on a file attachment:

1. **`BatchBillReviewTable.tsx`** (Enter with AI table) — The X button on the file icon calls `onBillDelete(bill.id)`, which deletes the whole pending bill record and its lines from the database.

2. **`EditExtractedBillDialog.tsx`** (Edit Extracted Bill dialog) — The X button shows a misleading message ("This will remove the entire bill from the queue") and closes the dialog without doing anything useful.

### Correct Behavior

Clicking X on an attachment should:
- Delete the file from Supabase Storage (`bill-attachments` bucket)
- Clear `file_name` and `file_path` on the `pending_bill_uploads` row (set them to empty/null)
- Keep the bill record and all its extracted line items intact in the queue
- Show the bill row without an attachment icon afterward

### What Will Change

#### Fix 1 — `src/components/bills/BatchBillReviewTable.tsx`

- **Line ~879–888**: The `×` button on the file icon currently calls `onBillDelete(bill.id)`. Replace this with a new `handleDeleteAttachment(bill)` function that:
  1. Calls `supabase.storage.from('bill-attachments').remove([bill.file_path])` to delete the file
  2. Calls `supabase.from('pending_bill_uploads').update({ file_name: '', file_path: '' }).eq('id', bill.id)` to clear the file reference
  3. Calls `onBillUpdate(bill.id, { file_name: '', file_path: '' })` to update local UI state
  4. Shows a success toast "Attachment removed"
- Add a confirmation step using the existing `DeleteConfirmationDialog` (or a simple window confirm), with the message: "Remove this attachment? The bill and its line items will remain in the queue."
- The **row-level Delete** in `TableRowActions` (line 910) correctly deletes the whole bill — this stays as-is.

#### Fix 2 — `src/components/bills/EditExtractedBillDialog.tsx`

- **Line ~847–861**: Replace the broken `confirm()` + close logic with a proper `handleDeleteAttachment` async function that:
  1. Deletes the file from storage
  2. Updates the `pending_bill_uploads` record to clear `file_path` and `file_name`
  3. Updates local state (`setFileName('')`, `setFilePath('')`)
  4. Shows success/error toast
- Use the existing `DeleteConfirmationDialog` component (already used elsewhere in the codebase) for the confirmation, with the correct message: "Remove this attachment? The bill and its line items will remain in the queue."
- Add state for `showDeleteAttachmentConfirm` to control the dialog visibility
- When `fileName` and `filePath` are empty, hide the attachment button/icon entirely (or show a "No attachment" placeholder)

### Files to Edit

- `src/components/bills/BatchBillReviewTable.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`
