

# Simplify Select Project Files Modal

## Summary
Simplify the "Select Project Files" modal by removing unnecessary UI elements and fixing the scrolling issue so users can scroll through all folders.

## Changes

### File: `src/components/bidding/SelectProjectFilesModal.tsx`

1. **Remove Search Input** (lines 320-329)
   - Delete the search input section entirely
   - Remove related state (`searchQuery`) and search filtering logic
   - Clean up unused imports (`Search`, `Input`)

2. **Remove "Select All" Button** (lines 337-359)
   - Delete the entire "Select All" section
   - Remove related functions (`handleSelectAll`, `isAllSelected`)
   - Keep only the selected files count display

3. **Fix Scrolling Issue**
   - The ScrollArea currently doesn't have a fixed height, preventing scroll
   - Add a fixed max height to the ScrollArea (e.g., `max-h-[400px]`)
   - Alternatively, use `overflow-y-auto` on the container

4. **Simplify Breadcrumb** (update SimpleBreadcrumb component)
   - Remove the Home icon from the "Project Files" button
   - Keep just the text "Project Files"

### File: `src/components/files/SimpleBreadcrumb.tsx`

- Remove the `Home` icon import
- Remove the `<Home className="h-4 w-4" />` from the button
- Keep just "Project Files" text

## Code Changes Summary

**SelectProjectFilesModal.tsx:**
- Remove `searchQuery` state
- Remove `filteredItems` useMemo (use `getCurrentItems` directly)
- Remove search input JSX
- Remove Select All button JSX
- Remove `handleSelectAll` and `isAllSelected` functions
- Remove unused imports: `Search`, `Input`
- Add fixed height to ScrollArea: `className="flex-1 border rounded-md max-h-[400px]"`

**SimpleBreadcrumb.tsx:**
- Remove `Home` icon import
- Remove `<Home className="h-4 w-4" />` from button

## Visual Result
After these changes, the modal will show:
- Dialog header with title and description
- Breadcrumb navigation (just "Project Files" text, no icon)
- Selected files count (when files are selected)
- Scrollable list of folders and files
- Cancel and Attach buttons

