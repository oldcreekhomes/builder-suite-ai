# Fix: Move dialog must list the real folder tree

## What went wrong

My last change made the "Move Items to Folder" dropdown expand every stored folder record into all of its parent paths. Some stored records in this project are stale leftovers from folders that were renamed long ago (for example a record for `01 - Corporate Documents/Corporate Documents` and three under `04 - Drawings/Old Drawings - DON'T USE/...`). Expanding those invented top-level entries like `01 - Corporate Documents` and `04 - Drawings`, which do not exist in the file explorer.

## The fix

Build the dropdown list the exact same way the file explorer builds its tree, so the two always match:

- Walk the tree from the root: a folder appears only if it is reachable from the root, either because a file lives under it or because a stored folder record's parent folder is itself already visible.
- Stop inventing missing parent folders. A stored record whose parent chain does not exist in the explorer is ignored, exactly as the explorer ignores it today.
- Keep the existing behavior that the folders being moved (and their subfolders) are excluded as destinations.

Result: the dropdown shows `Bidding Analyses`, `Bond`, `Closing Documents - Acquisition`, `Corporate Documents`, `Drawings`, `Financing/Refinance/Loan Application Documents`, etc. — the same names shown in the Files screen, and nothing else. Empty folders created through the app still appear, because their parent is visible.

## Technical notes

- File: `src/components/files/MoveFilesModal.tsx`, `fetchFolders()`.
- Replace the "add every ancestor path" loop with a breadth-first expansion mirroring `getCurrentItems()` in `SimpleFileManager.tsx`: children of a path come from (a) file paths under that path and (b) `project_folders` rows whose `parent_path` equals that path (null/empty for root).
- No database changes; stale `project_folders` rows are simply not surfaced. Cleaning them up can be a separate request.
