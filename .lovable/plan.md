## Fix shared folders correctly

The database confirms the files still contain their full paths, but the share payload currently excludes the folder records (`folderkeeper`). That means the shared page only receives files, so it cannot preserve empty folders or the exact 18-folder structure. The live custom-domain page is also still rendering the older flat-list version.

1. **Include the folder structure in the share payload**
   - Update the folder-share query to collect descendant folder records as well as descendant files.
   - Save explicit relative folder paths in `shared_links.data`, including folders that contain no files.
   - Keep all file paths relative to the shared root so nested levels remain intact.

2. **Render the saved hierarchy on the public share page**
   - Build each view from both the saved folders and files.
   - At the root, show the 18 immediate folders rather than all descendant files.
   - Clicking a folder will show its immediate subfolders and files, with breadcrumbs for navigation.
   - Keep individual downloads and Download All with the same directory structure inside the ZIP.

3. **Handle existing links safely**
   - Support older share records by reconstructing folders from file paths where possible.
   - Newly generated links will preserve the complete structure, including empty folders.
   - Use the new Unshare action on the current link, then create a fresh link so its payload includes the explicit folders.

4. **Verify the exact example**
   - Test `Submission Documents - Formal` in the preview.
   - Confirm the root shows the expected folders, files do not appear until their containing folder is opened, and nested downloads still work.