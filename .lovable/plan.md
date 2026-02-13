

# Fix: Delete Old Folder Entry After Successful Move

## Problem

When moving a folder (e.g., "Fontanelle") from "Drawings" to "Old Drawings," all files are moved correctly, but the original empty folder still appears in "Drawings." It should be removed since it was moved.

## Root Cause

In `MoveFilesModal.tsx`, after successfully moving all files within a folder (lines 130-182), the code never:
1. Deletes the old `project_folders` database entry for the source folder
2. Creates a new `project_folders` entry at the destination

The files move perfectly, but the folder record in `project_folders` stays at the old path, so the UI still renders the empty ghost folder.

## Fix

**File: `src/components/files/MoveFilesModal.tsx`**

After a folder is successfully moved (around line 169-171, where `successCount++` happens), add two operations:

1. **Delete the old folder entry** (and any subfolder entries under it) from `project_folders`
2. **Insert a new folder entry** at the destination path in `project_folders`

```text
Example:
  Source: folder.path = "Drawings/Fontanelle"
  Destination: selectedFolder = "Old Drawings"

  After files are moved:
    DELETE FROM project_folders
      WHERE project_id = ? AND (folder_path = 'Drawings/Fontanelle' OR folder_path LIKE 'Drawings/Fontanelle/%')

    INSERT INTO project_folders (project_id, folder_path, parent_path, folder_name, created_by)
      VALUES (?, 'Old Drawings/Fontanelle', 'Old Drawings', 'Fontanelle', user.id)
```

The same cleanup applies to the empty folder case (lines 172-176) -- delete the old entry and create the new one at the destination.

## Files to Edit

| File | Change |
|---|---|
| `src/components/files/MoveFilesModal.tsx` | After successful folder move, delete old `project_folders` entry and insert new one at the destination path |

