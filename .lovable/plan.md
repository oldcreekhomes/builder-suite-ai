

## Folder-Level Access Control for Project Files

### Summary
Add a lock/unlock feature to folders in the Files section. When locked, only the company owner can see the folder by default. The owner can grant specific employees access to locked folders via a management dialog.

### Database Changes (1 migration)

**Two new tables:**

1. **`project_folder_locks`** -- tracks which folders are locked
   - `id` (uuid PK), `project_id` (uuid FK projects), `folder_path` (text), `locked_by` (uuid FK auth.users), `created_at` (timestamptz)
   - Unique constraint on (project_id, folder_path)
   - RLS: authenticated users in the same company can read; only owners can insert/delete

2. **`project_folder_access_grants`** -- per-user access to locked folders
   - `id` (uuid PK), `project_id` (uuid FK projects), `folder_path` (text), `user_id` (uuid FK auth.users), `granted_by` (uuid FK auth.users), `created_at` (timestamptz)
   - Unique constraint on (project_id, folder_path, user_id)
   - RLS: owner can CRUD; granted user can read their own rows

### New Files

1. **`src/hooks/useProjectFolderLocks.ts`**
   - `useProjectFolderLocks(projectId)` -- fetches all locks and grants for the project
   - `useLockFolder()` -- mutation to insert into `project_folder_locks`
   - `useUnlockFolder()` -- mutation to delete from `project_folder_locks` (and cascade grants)
   - `useGrantFolderAccess()` / `useRevokeFolderAccess()` -- mutations for grants
   - Helper: `isFolderLocked(folderPath)` -- checks if folder or any parent is locked
   - Helper: `canAccessFolder(folderPath, userId, isOwner)` -- returns true if owner, or user has grant for the locked folder/parent

2. **`src/components/files/FolderAccessModal.tsx`**
   - Dialog showing company employees with checkboxes
   - Owner toggles which employees can access the locked folder
   - Fetches employees via same pattern as EmployeeTable (query `users` by `home_builder_id`)

### Modified Files

3. **`src/components/files/SimpleFileList.tsx`**
   - Accept new props: `lockedFolders`, `folderGrants`, `isOwner`, `onLockFolder`, `onUnlockFolder`, `onManageAccess`
   - Folder row actions: add "Lock Folder" / "Unlock Folder" (owner only) and "Manage Access" (owner only, when locked)
   - Show red `Lock` icon next to locked folder names (per standardization memory)
   - Filter out locked folders for non-owner users without grants

4. **`src/components/files/SimpleFileManager.tsx`**
   - Import `useProjectFolderLocks` and `useUserRole`
   - In `getCurrentItems()`: after building folders/files, filter out any folder (and its files) that is locked and the current user lacks access
   - Pass lock data and callbacks down to `SimpleFileList`

5. **`src/components/bidding/SelectProjectFilesModal.tsx`**
   - Apply the same filtering logic so locked folders don't appear in the bid file picker for unauthorized users

### Filtering Logic
- A folder is restricted if its path (or any parent path) exists in `project_folder_locks`
- Owner always sees everything (locked folders shown with red Lock icon)
- Non-owner users: folder is hidden unless they have a matching row in `project_folder_access_grants`
- Files inside locked folders are also hidden from unauthorized users

### Lock Icon Standard
Per project conventions, all Lock icons will use `text-red-600` styling.

