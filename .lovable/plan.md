## Fix two Journal Entry issues

### 1. Journal Entry # is reversed
The form numbers entries from a list sorted newest-first, so the oldest entry shows as #5 and the newest as #1 (chronologically reversed). Numbering should ascend: the first/oldest entry is #1, the newest is the highest number. The Prev/Next arrows should also walk in ascending chronological order.

**Change in `src/components/journal/JournalEntryForm.tsx`:**
- Reverse `filteredEntries` so index 0 = oldest entry. This single change makes:
  - `Journal Entry #` field display the correct ascending number (index + 1).
  - `Position N of M` counter ascend chronologically.
  - The `<` / `>` arrow buttons step from #1 → #2 → … → #N in date order.
- No DB or hook changes; ordering for other consumers (`useJournalEntries`) stays as-is.

### 2. Attachments are locked when the period is closed
Currently, when the entry is in a closed period (or has reconciled lines), the entire Attachments block has `pointer-events-none`, which blocks the preview/open button as well. Opening a PDF doesn't modify anything, so it should always work — only adding/removing files should be blocked.

**Change in `src/components/journal/JournalEntryForm.tsx` (Attachments wrapper, ~line 649):**
- Remove the `pointer-events-none` wrapper class when `isTransactionLocked` is true.
- Keep the existing `disabled={isTransactionLocked || isUploading}` on `JournalEntryAttachmentUpload`, which already disables only the Add Files button and the Remove (X) button while leaving the file-name preview click handler active.
- Result: users can click a listed attachment to open/preview/download it even when the entry is locked; they still cannot add new files or delete existing ones.

### Out of scope
No changes to the locked-state badge, save/edit gating, period-close logic, reconciliation logic, or other transaction types.
