## Problem

When sharing a folder that contains subfolders, the current share collects all descendant files correctly (via `startsWith("${folder.path}/")` in `SimpleFileList.tsx`), but the public share page (`src/pages/SharedFolder.tsx`) flattens them — it renders every file at the top level and strips the path with `split('/').pop()`. That's why the "Submission Documents - Formal" link shows 23 individual files instead of the 18 subfolders.

The stored share data already includes the full `original_filename` path for each file, so no re-share or database change is needed. Only the public viewer needs to be updated to reconstruct and navigate the tree.

## Fix (frontend only: `src/pages/SharedFolder.tsx`)

1. Add a root `folderPath` state (already loaded from `data.folder_path`) and a new `currentPath` state initialized to `folderPath`.
2. Build a tree from the flat `files[]` by stripping the shared root prefix from each `original_filename` and splitting the remainder on `/`. Any file with more than one remaining segment becomes a descendant of a subfolder.
3. Derive `currentFolders` and `currentFiles` for the `currentPath`:
   - `currentFolders`: unique immediate-child folder names at the current path.
   - `currentFiles`: files whose parent path equals `currentPath` exactly.
4. Render breadcrumbs from the root folder name down to `currentPath`; each crumb sets `currentPath` on click.
5. Render subfolders first (folder icon, name, file count including descendants) — clicking descends into that folder. Then render files with the existing Download button; display just the leaf filename.
6. Update the header count to say "X folders · Y files" when at the root, or the file/folder counts for the current view.
7. Keep "Download All" behavior as-is (still zips every file in the share) but hide it inside subfolders is not required — leave it visible at every level and continue to zip the entire share; label unchanged.

## Out of scope

- No changes to `FolderShareModal`, `share-redirect`, `public-file-download`, or DB schema — the existing share payload already carries the paths needed to rebuild the tree.
- Photo-share flow is unchanged.
