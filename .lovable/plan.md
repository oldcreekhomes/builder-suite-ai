
# Redesign "Select Project Files" Modal to Match Main File Browser

## Summary
Completely redesign the `SelectProjectFilesModal` to look identical to the main file browser (`SimpleFileList`). The current modal shows a flat list of files with full paths displayed, but it should show folder navigation with the same visual styling as the Files page.

## Visual Changes

### Current State
- Flat list showing full file paths like "Drawings/Old Drawings/Old Architecture/file.pdf"
- No folder navigation
- Different row styling than the main file browser

### Target State (matching first screenshot)
- Folder navigation with blue folder icons
- Files shown only when inside the folder
- Same row styling: checkbox + folder/file icon + name + hover states
- Breadcrumb navigation to go back to parent folders
- "Select All" checkbox at the top

## Technical Approach

### Changes to `SelectProjectFilesModal.tsx`

1. **Add folder navigation state**
   - Add `currentPath` state to track which folder the user is viewing
   - Use the same path-based logic as `SimpleFileManager.getCurrentItems()`

2. **Use the `useProjectFolders` hook**
   - Import and use `useProjectFolders` to get folder structure
   - Apply the same folder/file filtering logic as the main file browser

3. **Add breadcrumb navigation**
   - Import and use `SimpleBreadcrumb` component
   - Allow navigating back to parent folders

4. **Match the visual styling**
   - Use the same row structure as `SimpleFileList`:
     - Checkbox (Square/CheckSquare icons with ghost button)
     - Blue Folder icon for folders
     - File type emoji icons for files
     - Name displayed the same way
     - Rounded borders with hover states

5. **Update selection logic**
   - When selecting a folder, include all files within that folder
   - Maintain separate tracking for selected files vs folders
   - Calculate total selected items count for the Attach button

## Component Structure

```text
SelectProjectFilesModal
  |
  +-- DialogHeader (title + description)
  |
  +-- Search Input
  |
  +-- SimpleBreadcrumb (path navigation)
  |
  +-- Select All row
  |
  +-- ScrollArea containing:
  |     +-- Folder rows (clickable to navigate, checkbox to select all contents)
  |     +-- File rows (checkbox to select individual files)
  |
  +-- DialogFooter (Cancel + Attach buttons)
```

## Files to Modify

1. **`src/components/bidding/SelectProjectFilesModal.tsx`** (complete rewrite)
   - Add `currentPath` state for folder navigation
   - Import `useProjectFolders` hook
   - Implement `getCurrentItems()` logic (same as SimpleFileManager)
   - Add `SimpleBreadcrumb` for navigation
   - Match row styling exactly to `SimpleFileList`:
     - `flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent`
     - Ghost button with Square/CheckSquare icons
     - Folder icon with `text-blue-500`
     - File emoji icons based on mime type
   - Handle folder click to navigate into folder
   - Handle folder selection to select all files within
   - Update "Select All" to work with current folder view

## Key Code Changes

### Row Styling (matching SimpleFileList)
```tsx
// Folder row
<div className="flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent">
  <Button variant="ghost" size="sm" className="p-1">
    {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
  </Button>
  <Folder className="h-5 w-5 text-blue-500" />
  <div className="flex-1 cursor-pointer">
    <p className="font-medium">{folder.name}</p>
  </div>
</div>

// File row
<div className="flex items-center gap-1.5 p-1.5 rounded-lg border hover:bg-accent">
  <Button variant="ghost" size="sm" className="p-1">
    {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
  </Button>
  <div className="text-xl">{getFileIcon(file.mime_type)}</div>
  <div className="flex-1 min-w-0 cursor-pointer">
    <p className="font-medium truncate">{file.displayName}</p>
  </div>
</div>
```

### getCurrentItems Logic
```tsx
// Same logic as SimpleFileManager.getCurrentItems()
const getCurrentItems = () => {
  const normalizedCurrentPath = normalizePath(currentPath);
  const folders = new Set<string>();
  const files: any[] = [];

  allFiles.forEach(file => {
    let filePath = normalizePath(file.original_filename);
    // ... same filtering logic
  });

  return { folders: sortedFolders, files: sortedFiles };
};
```

## User Experience Flow

1. User clicks "From Project Files" in the dropdown
2. Modal opens showing root folders and files (same as Files page)
3. User can click a folder to navigate into it
4. Breadcrumb shows current path, clicking navigates back
5. User selects files/folders using checkboxes
6. Selecting a folder adds all files within to selection
7. Click "Attach" to attach all selected files
