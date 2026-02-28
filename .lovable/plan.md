

## Align Files Page Buttons and Table with Sidebar

### Problem
The Files page has excessive vertical spacing between the header and the action buttons. The user wants the buttons row to sit at the same vertical level as the sidebar's Menus/Messages tabs, and the table top to align accordingly -- matching the Bidding page pattern.

### Root Cause
The `p-6` wrapper in `ProjectFiles.tsx` adds 24px of padding above the buttons. On the Bidding page, the `ContentSidebar` absorbs the left side while the content area's `p-6` is offset by having a search bar on the left. The Files page has no left sidebar or search, so the 24px top gap is visually prominent.

### Changes

**1. `src/pages/ProjectFiles.tsx`**
- Move the action buttons (Choose Files, Choose Folder, Choose Zip File, Create Folder) out of `SimpleFileManager` and into the `DashboardHeader` via the `headerAction` prop
- This places the buttons in the header bar itself, right-aligned on the same row as "Files" -- exactly like the lock button on the Budget page
- Remove the extra `p-6` top padding or reduce it so the table starts closer to the header

**2. `src/components/files/SimpleFileManager.tsx`**
- Remove the buttons row (`flex items-center justify-between` block, lines 778-831) from the component's return
- Extract the button-rendering and file input refs/handlers so they can be passed up or triggered from the parent
- Accept an optional prop like `renderButtons?: (container: React.RefObject) => React.ReactNode` or simply expose the file input refs and handlers via a callback prop
- The simplest approach: move the hidden file inputs and buttons into `ProjectFiles.tsx`, passing upload handlers down

Actually, the cleaner approach given the existing `headerAction` pattern:

**2a. `src/pages/ProjectFiles.tsx`**
- Import the button icons (FileText, FolderOpen, Archive, FolderPlus)
- Create the buttons as a `headerAction` ReactNode passed to `DashboardHeader`
- The buttons will use `size="sm"` (matching sidebar button sizing, h-9)
- Wire the buttons to trigger file inputs that live in this component or pass click handlers to `SimpleFileManager`

**2b. `src/components/files/SimpleFileManager.tsx`**
- Expose `triggerFileUpload`, `triggerFolderUpload`, `triggerZipUpload`, `triggerCreateFolder` via a ref (using `useImperativeHandle`) so the parent can call them from the header buttons
- Remove the buttons row from the component's render
- Keep the breadcrumb (only shows when navigated into subfolders)
- The component now starts directly with the upload progress (if any) and the file list table

**3. Spacing**
- Change the content wrapper in `ProjectFiles.tsx` from `p-6` to `px-6 pt-4 pb-6` to reduce top spacing, or keep `p-6` since removing the buttons row already moves the table up significantly
- The table's top edge will now sit much closer to the header, aligning with the sidebar's content area

### Result
- Buttons appear in the header row next to "Files" title (right-aligned), same pattern as Budget's lock button
- Table starts immediately below the header (with standard padding)
- Visual alignment matches the Bidding page where content sits right below the header
- Breadcrumb still appears when navigating into subfolders (inline above the table)

### Files Changed

| File | Action |
|------|--------|
| `src/pages/ProjectFiles.tsx` | Pass buttons as `headerAction` to DashboardHeader, wire to SimpleFileManager ref |
| `src/components/files/SimpleFileManager.tsx` | Expose upload triggers via `forwardRef` + `useImperativeHandle`, remove buttons from render |
