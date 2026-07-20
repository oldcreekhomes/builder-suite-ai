## Goal
Add the ability to revoke and regenerate a folder share link.

## Current behavior
`FolderShareModal` automatically reuses any non-expired `shared_links` row for the same `folder_path`. That is why the user keeps getting the same `id=vdar6hnzuqow6srzy8up5` URL. The rebuilt `SharedFolder.tsx` renders the folder tree from the paths already stored in that row, so the old link will now display correctly after a hard refresh.

## Proposed change
Update `src/components/files/components/FolderShareModal.tsx` so the modal has two states instead of always auto-generating:

1. **No active link** — show a primary **Share** button. Clicking it inserts a new `shared_links` row with a fresh `share_id` and shows the link.
2. **Active link exists** — show the link, a Copy button, and a red **Unshare** button. Clicking Unshare deletes the `shared_links` row (RLS already restricts deletes to `created_by = auth.uid()`), clears the local link state, and flips back to the Share state. The old URL then returns 404.

## Files touched
- `src/components/files/components/FolderShareModal.tsx` — split lookup vs. generation, add Unshare handler, update modal body to show Share/Unshare states.

## Out of scope
- File-level share modal and photo share modals — same pattern exists but user only asked about folders. Can be mirrored later if requested.
- Changing the 7-day expiry.
