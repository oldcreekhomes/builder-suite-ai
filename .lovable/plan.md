## Fix the folder share correctly

The database confirms the newest link saved **30 files and 0 folders**. This project’s folders are represented by `folderkeeper` rows in `project_files`; `project_folders` has no records for this hierarchy, so the current share query cannot capture it. The public URL is also serving the older flat-list page.

1. **Capture the actual folder structure**
   - Build the descendant folder list from the existing `folderkeeper` rows under the selected folder.
   - Save normalized paths relative to the shared root in `shared_links.data.folders`.
   - Save a normalized `relative_path` for every shared file so the viewer never has to guess its folder from a full pathname.

2. **Prevent reuse of malformed links**
   - When an existing active share has no saved folder hierarchy, refresh its payload from the current files and folderkeepers before returning the link.
   - Keep the Unshare action so a link can still be revoked and replaced intentionally.

3. **Render folders before files**
   - Update the public shared-folder page to use the saved relative folder and file paths.
   - At the root, show the immediate folders; opening one shows only its immediate children and files.
   - Preserve breadcrumbs, individual downloads, empty folders, and the same hierarchy inside Download All ZIPs.
   - Keep fallback reconstruction for older links that only contain full file paths.

4. **Make testing use the code being tested**
   - Generate the public share URL from the app’s current origin instead of always redirecting preview-created links to the published custom domain.
   - Production-created links will still use the production domain; preview-created links will open the preview implementation.

5. **Verify this exact folder**
   - Regenerate/refresh the `Submission Documents - Formal` share payload.
   - Confirm its payload contains the folder list, the root displays the numbered folders instead of 30 loose files, navigation preserves nesting, and ZIP paths match the source structure.
   - The production domain will require publishing after verification before old redirect links show the new viewer.