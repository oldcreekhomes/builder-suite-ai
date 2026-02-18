
## Convert Files Page to Standardized shadcn/ui Table

### What Changes
The current `SimpleFileList.tsx` uses a custom list-of-cards layout that does not match the rest of the application. It will be replaced with the standard shadcn/ui `Table` component using the `TableRowActions` `...` dropdown for all row actions, consistent with every other data table in the app (Manage Bills, Companies, Representatives, etc.).

### Layout After the Change

```text
| [ ] | Name          | Type  | Size    | Uploaded By   | Date        | Actions |
|-----|---------------|-------|---------|---------------|-------------|---------|
| [ ] | 📁 Drawings   |       |         |               |             |  ...    |
| [ ] | 📁 Specs      |       |         |               |             |  ...    |
| [ ] | budget.pdf    | PDF   | 1.2 MB  | jorge@...     | Jan 5, 2026 |  ...    |
| [ ] | contract.docx | DOCX  | 340 KB  | al@...        | Feb 1, 2026 |  ...    |
```

Folders appear at the top of the list. Clicking a folder name navigates into it (same as today). Clicking a file name opens the preview (same as today).

### Files to Edit

**1. `src/components/files/SimpleFileList.tsx`**
- Replace the custom `div`-based card rows with a proper `<Table>` using `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`
- Table columns: Checkbox | Name | Type | Size | Uploaded By | Date | Actions
- Folders render as rows at the top with a Folder icon; clicking the name navigates into the folder
- Files render below folders; clicking the name opens the preview
- All per-row actions (Rename, Download, Share, Move, Delete) are moved into the standard `TableRowActions` `...` dropdown
- Bulk selection checkbox in the header row to select all
- Destructive actions (Delete) styled red and separated by a divider in the dropdown
- Empty state remains: centered message when no files/folders exist

**2. `src/components/files/SimpleFileManager.tsx`** (minor)
- No logic changes needed; the toolbar (Upload File, Upload Folder, New Folder buttons) and breadcrumb above the list remain exactly as-is
- The `BulkActionBar` (bulk delete / move selected) remains above the table

### What Is Preserved
- All upload logic (file, folder, zip)
- Breadcrumb navigation
- Bulk select, bulk delete, bulk move
- Rename dialogs (rename file / rename folder) — triggered from the `...` menu
- Folder download as zip
- Share modal
- Move files modal
- All delete confirmation dialogs

### Standardization Rules Applied
- Default shadcn/ui `h-10` header, `text-muted-foreground` header text
- Default `p-2` cell padding, `text-sm` body text
- No `table-fixed`, explicit width classes on `TableHead` for Name column only
- Actions column: centered header "Actions", centered `...` trigger using `TableRowActions`
- No alternating row colors, default white background
