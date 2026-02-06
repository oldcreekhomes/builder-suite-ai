
# Add Files from Builder Suite - Project File Picker

## Summary
Add a feature that allows users to select files directly from the project's Builder Suite files when attaching files to bid packages, eliminating the need to download and re-upload files they already have in the system.

## User Experience

When clicking "Add Files" on a bidding package:
1. A dropdown or split button will appear with two options:
   - "From Computer" - Opens the current native file picker (existing behavior)
   - "From Project Files" - Opens a new modal to browse and select existing Builder Suite project files

The "From Project Files" modal will:
- Display a list of all project files with folder navigation
- Allow multi-select with checkboxes
- Show file icons, names, and sizes
- Include a search/filter capability
- Have "Cancel" and "Attach Selected" buttons

## Technical Approach

### 1. Create a New File Picker Modal Component
**New file**: `src/components/bidding/SelectProjectFilesModal.tsx`

This modal will:
- Use the existing `useProjectFiles` hook to fetch files
- Display files in a table format similar to the SimpleFileList component
- Support folder navigation using the same path-based logic
- Allow multi-selection with checkboxes
- Return selected file references on confirmation

### 2. Modify BiddingTableRowFiles Component
**File**: `src/components/bidding/components/BiddingTableRowFiles.tsx`

Changes:
- Replace the single "Add Files" button with a dropdown button
- Add state to control the new project files modal
- Add a handler for when project files are selected

### 3. Create a Link Files Handler in useBiddingMutations
**File**: `src/hooks/useBiddingMutations.ts`

Add a new function `handleLinkProjectFiles` that:
- Accepts an array of project file references (storage paths)
- Appends these references to the bid package's `files` array
- Uses the existing pattern for updating the `files` column

### 4. Storage Path Handling
Since project files use storage paths like `{projectId}/{uuid}_{filename}` and bidding files use `specifications/{filename}`:
- Store the full storage path reference in the `files` array
- Update the file preview/download logic to handle both path formats

## Component Structure

```text
BiddingTableRowFiles
  |
  +-- DropdownMenu (new)
  |     +-- "From Computer" (current native upload)
  |     +-- "From Project Files" (opens new modal)
  |
  +-- SelectProjectFilesModal (new)
        +-- Breadcrumb navigation
        +-- File list with checkboxes
        +-- Search filter
        +-- Attach button
```

## Files to Create/Modify

1. **Create**: `src/components/bidding/SelectProjectFilesModal.tsx`
   - New modal component for browsing and selecting project files

2. **Modify**: `src/components/bidding/components/BiddingTableRowFiles.tsx`
   - Add dropdown menu for upload options
   - Add modal state and handlers
   - Pass project files handler

3. **Modify**: `src/hooks/useBiddingMutations.ts`
   - Add `handleLinkProjectFiles` function
   - Return it from the hook

4. **Modify**: `src/components/bidding/BiddingTable.tsx`
   - Pass projectId to BiddingTableRow for the new modal

5. **Modify**: `src/components/bidding/BiddingTableRow.tsx`
   - Accept and pass projectId to BiddingTableRowFiles

## Benefits
- No more downloading and re-uploading files
- Faster workflow for attaching specifications
- Files are referenced (not copied), saving storage space
- Consistent experience with Builder Suite's file management
