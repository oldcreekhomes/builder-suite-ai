# Search Checks: replace Address with Entered By, add Attachments

## Why "Address" was there
It shows which lot(s) a check was split to (e.g. "Lot 1" or "+3" with a hover breakdown). The same info is already visible when you open the check, so it isn't needed in the search list.

## Changes (Search Checks window on Write Checks only)
- **Remove** the Address column.
- **Add "Entered By"** in the same spot: the initials of the person who created the check (e.g. "MG"), same as Files. Hover shows the full name. Falls back to email letters if no name; dash if unknown.
- **Add "Attachments"** to the right of Cleared: shows the check's files using the same file icons/preview used elsewhere (click opens the preview). Blank if none. Clicking it won't open the check.
- Search box also matches the Entered By name.

No accounting, saving or report changes.

## Technical details
- `src/hooks/useChecks.ts`: add `check_attachments (id, file_name, file_path, file_size, content_type)` to the checks select; look up `created_by` users (`id, first_name, last_name, email`) in a batched query and attach as `creator`.
- `src/components/checks/CheckSearchDialog.tsx`: drop the lot-allocation column/helper, add Entered By cell (reuse the `getInitials` pattern from `SimpleFileList.tsx`, with `title`), add Attachments cell reusing the existing shared files cell (`AttachmentFilesRow`/universal file preview) with `stopPropagation`; update `colSpan` to 9.
