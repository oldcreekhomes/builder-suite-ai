
## Fix Files Table Visual Appearance

### What's Wrong
The files table is technically using the correct `<Table>` component, but it doesn't visually match the rest of the app because:

1. `SimpleFileList.tsx` wraps the entire table in `<div className="p-4">` — adding 16px padding on all sides that no other table has
2. The BulkActionBar uses `bg-blue-50 p-4 rounded-lg mb-4` — a colored card look that is inconsistent
3. The "Move Selected" button floats in a separate `<div className="mb-3">` above the table instead of being integrated into the bulk action zone

### The Fix — One File Only

**`src/components/files/SimpleFileList.tsx`**

**Change 1 — Remove the outer padding wrapper**
Line 384: `<div className="p-4">` → `<div>` (no padding; the parent in SimpleFileManager already handles spacing)

**Change 2 — Inline the bulk actions above the table without a colored card**
Replace the separate BulkActionBar component call + Move Selected div with a single thin bar that only appears when items are selected, styled consistently (no blue background, no rounded card). The bar will show the count and two plain destructive/outline buttons: "Move Selected" and "Delete Selected". This matches how other tables handle bulk actions (just buttons in a row, no colored panel).

```text
Before:
  [Blue card: "2 file(s) selected" + Delete button]
  [Floating: Move Selected (2) button]
  [Table]

After:
  [plain row: "2 selected" | Move Selected | Delete Selected]  ← only visible when items checked
  [Table - full width, no padding wrap]
```

### What Is Not Changed
- All existing logic (delete, rename, move, share, folder download, bulk operations)
- The Table structure, columns, and TableRowActions dropdowns — these are already correct
- SimpleFileManager.tsx — no changes needed
- All dialogs and modals
