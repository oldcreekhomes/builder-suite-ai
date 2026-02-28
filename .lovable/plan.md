
## Move Photos Page Buttons to Header

### Problem
The "Choose Photos", "Choose Folder", and "Create Folder" buttons are inside the drag-and-drop zone instead of in the `DashboardHeader` action area, inconsistent with the Files page standard.

### Changes

**1. `src/pages/ProjectPhotos.tsx`**
- Add header action buttons (Choose Photos, Choose Folder, Create Folder) directly in `DashboardHeader`'s `headerAction` prop.
- Move the hidden file inputs and folder input refs up to this component.
- Pass file/folder upload handlers down to `PhotoUploadDropzone` (or call the existing `onDrop` from here).
- Also pass a `showNewFolderModal` state and `handleCreateFolder` up here, rendering `NewFolderModal` at the page level.

**2. `src/components/photos/PhotoUploadDropzone.tsx`**
- Remove the three buttons ("Choose Photos", "Choose Folder", "Create Folder") from inside the dropzone card.
- Remove the hidden file inputs (they move to the parent page).
- Remove `NewFolderModal` rendering (moves to parent page).
- Accept new props: remove `handleChoosePhotos`, `handleChoosePhotoFolder`, `handleNewFolder` since they are no longer needed internally.
- Export `uploadPhoto` and `onDrop` logic so the parent can reuse them, OR accept an `onFilesSelected` callback and keep upload logic internal.
- Simplest approach: Add `onRegisterUploadHandlers` callback prop so the dropzone can expose its `onDrop` function to the parent for the header buttons to use. Or, even simpler: accept `fileInputRef` and `folderInputRef` as props from the parent.

**Simplest approach chosen**: 
- Move refs (`fileInputRef`, `folderInputRef`), hidden inputs, `NewFolderModal`, and the three buttons to `ProjectPhotos.tsx`.
- `PhotoUploadDropzone` keeps only the drag-and-drop card UI and upload progress display.
- The `uploadPhoto` function and `onDrop` handler stay in `PhotoUploadDropzone` but are also exposed via a new `onFilesSelected` prop pattern -- or we simply move the upload logic to a shared hook.
- Actually simplest: keep `PhotoUploadDropzone` as-is for its upload logic, but add props `hideButtons={true}` and expose `onDrop` via a ref/callback so the parent can trigger it from header buttons. But that's complex.

**Final approach**: 
- Extract upload logic into the existing component but expose key handlers via props:
  - `PhotoUploadDropzone` accepts optional `renderButtons?: false` to hide internal buttons.
  - Parent creates its own refs and hidden inputs, calling `PhotoUploadDropzone`'s `onDrop` by passing files to it via a new `externalFiles` prop or by keeping upload logic in parent.
  
- Actually, the cleanest: Move the hidden inputs and button click handlers to `ProjectPhotos.tsx`. Pass `onDrop` (the upload handler) up from `PhotoUploadDropzone` via `onRegisterDrop` callback. Or just duplicate the file input refs in the parent since they just trigger clicks.

**Cleanest final approach**:
- `ProjectPhotos.tsx`: Create `fileInputRef` and `folderInputRef`, render hidden inputs, render `NewFolderModal`, and put the 3 buttons in `headerAction`.
- When files are selected via hidden inputs, call a handler that passes files to `PhotoUploadDropzone` via a new `pendingFiles` prop or just call `onUploadSuccess` after uploading.
- Since `PhotoUploadDropzone` already has the `uploadPhoto` logic tied to its internal state (progress tracking), the simplest path is: keep `PhotoUploadDropzone` but add an `onDropFiles` ref/imperative handle so the parent can trigger drops programmatically.

**Actual simplest**: 
- Add `ref` support to `PhotoUploadDropzone` via `useImperativeHandle` exposing `dropFiles(files: File[])`.
- Parent calls `dropzoneRef.current.dropFiles(files)` when header buttons trigger file selection.
- Remove buttons and hidden inputs from `PhotoUploadDropzone`.
- Add buttons, hidden inputs, and `NewFolderModal` to `ProjectPhotos.tsx` header.

### Files to Change

| File | Change |
|------|--------|
| `src/components/photos/PhotoUploadDropzone.tsx` | Remove 3 buttons, hidden file inputs, and NewFolderModal from render. Add `forwardRef` + `useImperativeHandle` exposing `dropFiles(files)`. Remove `handleChoosePhotos`, `handleChoosePhotoFolder`, `handleNewFolder` and associated refs. |
| `src/pages/ProjectPhotos.tsx` | Add `fileInputRef`, `folderInputRef`, `dropzoneRef`. Render hidden inputs and `NewFolderModal`. Put Choose Photos / Choose Folder / Create Folder buttons in `DashboardHeader`'s `headerAction`. Wire file input `onChange` to call `dropzoneRef.current.dropFiles(files)`. |

### Result
The three action buttons appear in the header bar to the right of "Photos" / "View and upload project photos." -- matching the Files page layout. The drag-and-drop zone remains in the content area for drag-and-drop functionality only.
