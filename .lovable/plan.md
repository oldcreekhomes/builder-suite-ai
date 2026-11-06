# Fix "Empty folder" error when sharing a folder at Nob Hill

## The problem
Nob Hill has 1,272 files. When you share a folder, the app reads the job's file list, but it only gets the first 1,000. The 9 files in "Electrical Bid Specs" weren't in that first 1,000, so the app wrongly says the folder is empty. Download Folder has the same problem.

## Fix
- Share Folder and Download Folder will read only the files inside the chosen folder, not the whole job. A big job can no longer push any files out.
- They will also read the list in pages, so a single folder with more than 1,000 files still works.
- After that, sharing works as usual: you pick the folder, the share window opens with all of its files and subfolders, and you get the link.

## Technical details
- `src/components/files/SimpleFileList.tsx`, `handleFolderShare` and `handleFolderDownload`: add `.like('original_filename', '<escaped path>/%')` (escape `%`/`_`) and loop with `.range()` in 1000-row pages until a short page.
- No database changes.
