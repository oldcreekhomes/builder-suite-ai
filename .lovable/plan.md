

# Add "From Project Files" Option to Bid Package Details Modal

## Summary
The "Add Files" dropdown in the bid package details modal only shows "From Computer" because the required `projectId` and `onLinkProjectFiles` props are not being passed to the `BiddingTableRowFiles` component inside the modal. This plan adds those props to match the table row behavior.

## Root Cause
In `BiddingTableRowFiles.tsx`, the "From Project Files" menu item only renders when **both** conditions are met:
```tsx
{projectId && onLinkProjectFiles && (
  <DropdownMenuItem onClick={() => setShowProjectFilesModal(true)}>
    <FolderOpen className="mr-2 h-4 w-4" />
    From Project Files
  </DropdownMenuItem>
)}
```

Currently, `BidPackageDetailsModal` doesn't receive or pass these props.

## Changes

### File: `src/components/bidding/BidPackageDetailsModal.tsx`

1. **Add `onLinkProjectFiles` to the props interface** (around line 37)
   - Add: `onLinkProjectFiles?: (itemId: string, storagePaths: string[]) => void;`

2. **Destructure the new prop** (around line 75)
   - Add `onLinkProjectFiles` to the destructured props

3. **Pass props to `BiddingTableRowFiles`** (around line 274-279)
   - Add `projectId={item.project_id}` (we can use `item.project_id` since the item already has this)
   - Add `onLinkProjectFiles={onLinkProjectFiles}`

### File: `src/components/bidding/BiddingTableRow.tsx`

4. **Pass `onLinkProjectFiles` to `BidPackageDetailsModal`** (around line 168-203)
   - Add: `onLinkProjectFiles={onLinkProjectFiles}`

## Code Changes

**BidPackageDetailsModal.tsx - Props interface (add after line 37):**
```tsx
onLinkProjectFiles?: (itemId: string, storagePaths: string[]) => void;
```

**BidPackageDetailsModal.tsx - Destructure (add to destructure list):**
```tsx
onLinkProjectFiles,
```

**BidPackageDetailsModal.tsx - BiddingTableRowFiles usage (lines 274-279):**
```tsx
<BiddingTableRowFiles
  item={item}
  projectId={item.project_id}
  onFileUpload={(itemId, files) => onFileUpload?.(itemId, files)}
  onDeleteIndividualFile={(itemId, fileName) => onDeleteIndividualFile?.(itemId, fileName)}
  onLinkProjectFiles={onLinkProjectFiles}
  isReadOnly={isReadOnly}
/>
```

**BiddingTableRow.tsx - BidPackageDetailsModal usage (add after line 180):**
```tsx
onLinkProjectFiles={onLinkProjectFiles}
```

## Result
After these changes, when clicking "Add Files" in the bid package details modal, the dropdown will show both:
- From Computer
- From Project Files

Clicking "From Project Files" will open the same project files selection modal that works in the table view.

