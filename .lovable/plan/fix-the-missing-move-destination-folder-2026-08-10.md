# Fix the missing move destination folder

## Confirmed cause

The Files screen loads all project files with pagination, but the Move dialog runs a direct `project_files` query. N Potomac has 1,413 active file rows, so Supabase returns only the first 1,000 rows to that dialog.

Both empty-folder marker rows exist in `project_files`:

- `Financing/Refinance/LOIs/.folderkeeper`
- `Financing/Refinance/Loan Application Documents/.folderkeeper`

The missing folder is outside the Move dialog's incomplete result set, so the Files screen can show it while the destination dropdown cannot.

## Implementation

- Update `MoveFilesModal.fetchFolders()` to load every active `project_files.original_filename` row through the existing paginated `fetchAllRows` helper.
- Keep the current root-reachable tree walk so stale `project_folders` records do not recreate fake `01 - ...` or `04 - ...` folders.
- Keep excluding selected folders and their descendants as invalid destinations.
- Verify the dropdown contains both `Financing/Refinance/LOIs` and `Financing/Refinance/Loan Application Documents`, while the stale numbered paths remain absent.

## Technical scope

Frontend data-loading fix only in `src/components/files/MoveFilesModal.tsx`; no database changes.
