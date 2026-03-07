

## Consolidate Duplicate Attachment Sections in Edit Bill Dialog

### Problem
The Edit Bill dialog has two separate attachment displays:
1. **"Attachments"** (row 3, next to Internal Notes) — the `BillAttachmentUpload` component showing only *newly added* files (`newAttachments` state) with an "Add Files" button
2. **"Existing Attachments"** (row 4, below) — a standalone section showing *already-saved* database attachments (`attachments` state) with delete buttons

This is confusing and redundant. Users see "Attachments" with an "Add Files" button, then below it "Existing Attachments" showing the actual files.

### Solution
Merge both into one unified "Attachments" display in the header grid (row 3, next to Internal Notes):

1. **Pass both `attachments` (existing) and `newAttachments` (new) to `BillAttachmentUpload`**, or combine them into a single list so existing file icons appear inline alongside any newly added files and the "Add Files" button.

2. **Remove the entire "Existing Attachments" section** (lines ~740-806) — this eliminates the separate block and its grid wrapper. The Review Notes section (if present) will need to be relocated into the header grid or kept as a standalone row.

3. **Update `BillAttachmentUpload`** to accept an optional `existingAttachments` prop with its own delete handler (since existing attachments use `handleDeleteAttachment` from EditBillDialog, not the component's internal handler). Existing attachments will render as clickable icons (using `openBillAttachment` for preview) with red delete badges, followed by any new attachment icons, then the "Add Files" button.

### Technical Details

**`src/components/BillAttachmentUpload.tsx`**
- Add optional `existingAttachments` prop (array of existing DB attachments with id, file_name, file_path, etc.)
- Add optional `onDeleteExisting` callback for handling deletion of existing attachments
- Add optional `onClickExisting` callback for previewing existing attachments
- Render existing attachment icons before new attachment icons, both before the "Add Files" button

**`src/components/bills/EditBillDialog.tsx`**
- Pass `attachments`, `handleDeleteAttachment`, and `openBillAttachment` to `BillAttachmentUpload` as new props
- Remove the "Existing Attachments and Review Notes" block (lines ~740-806)
- If Review Notes exist, render them inline in the header grid (add a 5th column or place below)

### Files
- `src/components/BillAttachmentUpload.tsx`
- `src/components/bills/EditBillDialog.tsx`

