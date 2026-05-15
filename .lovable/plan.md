## Goal

Add a **Share** option to the folder Actions dropdown on the Files page, mirroring the existing file Share behavior (7-day expiring link, same flow).

## Background

The `FolderShareModal` component, the `shared_links` table support for `share_type = 'folder'`, the `share-redirect` edge function, and the public `/s/f/:id` SharedFolder page **already exist** and are already used elsewhere. They're just not wired into the folder dropdown in `SimpleFileList.tsx` — only the file row has a Share action today.

## Changes

**`src/components/files/SimpleFileList.tsx`**

1. Import `FolderShareModal`.
2. Add state: `const [shareFolder, setShareFolder] = useState<{ path: string; name: string; files: any[] } | null>(null)`.
3. Add a handler `handleFolderShare(folder)` that:
   - Queries `project_files` for the project (same pattern as `handleFolderDownload`), filters to files whose `original_filename` starts with `${folder.path}/`.
   - Toasts an error if the folder is empty.
   - Otherwise sets `shareFolder` with the folder path, name, and the filtered file list (shaped to match `FolderShareModal`'s `ProjectFile` interface: id, original_filename, file_size, file_type, storage_path, project_id, uploaded_by, uploaded_at).
4. Insert a **Share** entry in the folder `TableRowActions` array (right after `Download as Zip`) wired to `handleFolderShare(folder)`.
5. Render `<FolderShareModal isOpen={!!shareFolder} onClose={() => setShareFolder(null)} folderPath={shareFolder?.path ?? ''} files={shareFolder?.files ?? []} projectId={projectId} />` at the bottom alongside the existing `FileShareModal`.

## Out of scope

- No DB / edge function / SharedFolder page changes — they already work.
- No changes to file Share, Lock, Rename, Move, Delete actions.
- No changes to bulk actions.
