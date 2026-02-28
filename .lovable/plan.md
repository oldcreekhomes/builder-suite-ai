

## Standardize Files Page Layout to Match Bidding Page

### Problem
The Files page has extra elements and inconsistent spacing compared to the Bidding page:
1. "Project Files" breadcrumb label and "Maximum file size: 50MB" text are redundant
2. A gray border-b line separates the buttons from the file list -- not present on Bidding
3. More top padding above the buttons compared to Bidding
4. The 50MB limit warning should appear only when a user tries to upload an oversized file (already handled in `isValidFile` with a toast)

### Changes

**File: `src/components/files/SimpleFileManager.tsx` (lines 774-834)**

Replace the breadcrumb/buttons bar to remove the `border-b`, remove "Maximum file size: 50MB" text, and restructure the layout to match BiddingTable's pattern:

- Remove the outer `px-4 py-3 border-b` wrapper div
- Remove the "Maximum file size: 50MB" `<span>`
- Keep the breadcrumb on the left and buttons on the right, but in a flat layout without the separator line
- Change the file list area from `p-4` to remove extra padding since the parent already provides `p-6`
- The 50MB validation toast already exists in `isValidFile()` (line 210-217), so no new warning logic is needed

The new structure inside the `return` will be:

```
<div className="space-y-4">              <!-- matches BiddingTable's space-y-4 -->
  <div className="flex items-center justify-between">
    <SimpleBreadcrumb ... />              <!-- left side -->
    <div className="flex items-center space-x-2">
      Choose Files | Choose Folder | Choose Zip File | Create Folder
    </div>
  </div>
  
  {/* Upload Progress (if any) */}
  
  {/* File List */}
  <div className="border rounded-lg overflow-hidden">
    <SimpleFileList ... />
  </div>
</div>
```

**File: `src/pages/ProjectFiles.tsx`**

Change the content wrapper from `<div className="flex-1 p-6">` -- this already provides `p-6` which matches the Bidding page's `p-6` from BiddingTabs line 37. No change needed here.

### Summary of Removals
- "Project Files" label text (from SimpleBreadcrumb -- it will still show when navigated into subfolders)
- "Maximum file size: 50MB" text
- The gray `border-b` line below the buttons
- Extra vertical padding above the buttons

### What Stays
- All four buttons (Choose Files, Choose Folder, Choose Zip File, Create Folder)
- Upload progress section
- File list with border rounded-lg
- 50MB file size validation via toast (already working)
- Breadcrumb navigation (shows path when in subfolders)
