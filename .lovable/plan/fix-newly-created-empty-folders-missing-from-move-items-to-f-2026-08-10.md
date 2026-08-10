# Fix: newly created (empty) folders missing from "Move Items to Folder"

## What's happening

The destination dropdown in the Move dialog does not list every folder in the project. It only lists folders it can infer from existing file paths — it reads the file list and splits each file's path into folder segments.

That's why `Financing/Refinance/LOIs` shows up (it contains files) but `Financing/Refinance/Loan Application Documents` does not: the new folder is empty, so no file path mentions it, so the dropdown never learns it exists. It shows correctly in the file browser because the browser reads the real folder records.

## The fix

Make the Move dialog's folder list read the actual folder records for the project and merge them with the folders inferred from file paths:

- Load all folder rows for the project (the same source the file browser uses).
- Union those paths with the paths derived from file names, de-duplicate, and sort.
- Exclude the folders currently being moved and their subfolders from the destination list, so a folder can't be moved into itself.

Result: every folder — empty or not, at any nesting depth — appears as a valid destination.

## Technical notes

- File: `src/components/files/MoveFilesModal.tsx`, in `fetchFolders()`.
- Add a query against `project_folders` (`folder_path` for this `project_id`) alongside the existing `project_files` query, then build the `existingFolders` set from both.
- No database changes; presentation/data-loading only.
