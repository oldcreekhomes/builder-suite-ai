## Problem

On the Write Checks tab, clicking an attachment icon does nothing until after the check is saved. `handleDownloadAttachment` in `CheckAttachmentUpload.tsx` early-returns when `attachment.id`/`checkId` are missing, so freshly added files (still in-memory `File` objects) can't be opened.

## Fix

In `src/components/checks/CheckAttachmentUpload.tsx`:

1. **`handleDownloadAttachment`**: handle the unsaved case. If `attachment.file` exists (temp attachment), open it directly via `URL.createObjectURL(attachment.file)` in a new tab (PDFs/images preview inline; other types download). Revoke the URL on cleanup. Keep existing Supabase-storage path for saved attachments.
2. **Icon button**: remove the `disabled={!attachment.id || !checkId}` guard so temp files are clickable.

No other components, business logic, or save flow change.
