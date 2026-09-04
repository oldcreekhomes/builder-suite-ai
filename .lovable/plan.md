# Add files to bills from the table (all tabs)

## What you'll get

In the Files column of the bills table, each row gets a small "+" button next to the existing file icons. Click it, pick one or more files, and they attach to that bill right away — no need to open Edit Bill.

This works in Review, Rejected, Approved, and Paid, including paid bills that are otherwise locked. Existing files can still be opened by clicking their icon, and nothing can be deleted from this column.

Rows with no files show the "+" instead of the dash, so it's obvious where to add.

## How it behaves

- Multiple files at once; 20MB per file limit, same as elsewhere.
- Short "uploading" state on the button, success/failure toast.
- The row refreshes so the new file icon appears immediately.

## Technical notes

- Extend `src/components/bills/BillFilesCell.tsx` with optional `billId` and `onUploaded` props and a hidden file input. Upload to the `bill-attachments` bucket at `<billId>/<timestamp>_<sanitized name>`, then insert into `bill_attachments` (mirroring the logic already in `BillAttachmentUpload.tsx`); on DB failure remove the uploaded object.
- Pass `billId` and an `onUploaded` callback from both `BillFilesCell` usages in `BillsApprovalTable.tsx` (parent row line ~1227 and child/split row line ~2017); the callback invalidates the `bills-for-approval-v3` query.
- The other two usages (`JobCostActualDialog`, `AccountsPayableContent`) keep read-only behavior since `billId` stays optional.
- No delete affordance is added; no schema or RLS changes (existing insert policies on `bill_attachments` already cover this).
