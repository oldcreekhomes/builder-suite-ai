

## Goal
Add a "Files" column to the PO Status Summary table and left-align all columns for consistency.

## Investigation needed
- Read `BillPOSummaryDialog.tsx` to see current table structure.
- Find how PO files are stored on `project_purchase_orders` (likely a `files` jsonb column or a related proposals/attachments structure) and how they are rendered elsewhere (e.g., `FilesCell.tsx` already exists for purchase order files).
- Confirm `useVendorPurchaseOrders` returns the files field, or extend it.

## Plan

### 1. Add Files column
- In `BillPOSummaryDialog.tsx`:
  - Add a new `<TableHead>Files</TableHead>` after the Status column.
  - For each row, render the matched PO's files using the existing `FilesCell` component (from `src/components/purchaseOrders/components/FilesCell.tsx`) so behavior matches the rest of the app (icons, click-to-preview).
  - Pass `files={po.files}` and `projectId={po.project_id}` (or the bill's project id).

### 2. Ensure PO files are available
- Update `useVendorPurchaseOrders.ts` select to include `files, project_id` for both the approved query and the `includePoIds` fallback query, so `FilesCell` has what it needs.

### 3. Left-align all columns
- Remove `text-right` from `PO Amount`, `Billed to Date`, `This Bill`, `Remaining`, `Status` headers and cells.
- Keep currency formatting unchanged; just change alignment.
- Files column also left-aligned.

### Files to update
- `src/components/bills/BillPOSummaryDialog.tsx`
- `src/hooks/useVendorPurchaseOrders.ts`

## Verification
- Open PO Status Summary for bill C26019: 7 columns now (PO Number, Cost Code, PO Amount, Billed to Date, This Bill, Remaining, Status, Files).
- All headers and cells left-aligned.
- Files column shows file icons for each PO; clicking previews the file.
- POs with no files show the dash placeholder.

