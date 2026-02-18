
## Fix: Show `bill_attachments` in the "Enter with AI" Table

### Root Cause

The Files column in `BatchBillReviewTable` only reads `bill.file_name` and `bill.file_path` from the `pending_bill_uploads` row (the original uploaded PDF). When a user adds extra attachments through the Edit Extracted Bill dialog, those files are saved to the `bill_attachments` table (linked by `pending_upload_id`), not written back to the `pending_bill_uploads` row. The table never queries `bill_attachments`, so the new files are invisible.

### What Changes

**Two files need to change:**

#### 1. `BatchBillReviewTable.tsx`

- Add an `attachments` field to the `PendingBill` interface: `attachments?: Array<{ id: string; file_name: string; file_path: string }>`.
- Update the Files cell (lines ~886-917) to render from `bill.attachments` (the new multi-file list) instead of the single `bill.file_name`. Use the same icon + click-to-preview behavior already in `EditExtractedBillDialog`. Show up to 3 file icons, with a "+N" overflow label (matching the pattern in `BillFilesCell`).
- When the Edit dialog closes (the `onOpenChange` callback), also re-fetch attachments from `bill_attachments` for that bill and pass them back to the parent via `onBillUpdate`.

#### 2. `BillsApprovalTabs.tsx`

- When `batchBills` is built from `pendingBills` (the `useEffect` that fetches lines), also fetch `bill_attachments` for each pending upload and attach them as `attachments: [...]` on each `BatchBill` object.
- Pass `onBillUpdate` updates from `BatchBillReviewTable` back into `batchBills` state — this already works for vendor/line changes, so the same path will carry the refreshed attachments after the dialog closes.

### Technical Details

The fetch added alongside the lines fetch in `BillsApprovalTabs`:

```ts
const { data: attachments } = await supabase
  .from('bill_attachments')
  .select('id, file_name, file_path')
  .eq('pending_upload_id', bill.id);

return { ...bill, lines: processedLines, attachments: attachments || [] };
```

After the Edit dialog closes, `BatchBillReviewTable` re-fetches lines and similarly re-fetches attachments, calling `onBillUpdate(closingBillId, { ..., attachments })`.

The Files cell becomes:

```tsx
{/* Files - multi-attachment support */}
<TableCell className="w-14 text-center">
  <div className="flex items-center justify-center gap-1">
    {(bill.attachments || []).slice(0, 3).map(att => {
      const Icon = getFileIcon(att.file_name);
      return (
        <button key={att.id}
          onClick={() => openBillAttachment(att.file_path, att.file_name)}
          className={`${getFileIconColor(att.file_name)} transition-colors p-1`}
          title={att.file_name}>
          <Icon className="h-4 w-4" />
        </button>
      );
    })}
    {(bill.attachments?.length || 0) > 3 && (
      <span className="text-xs text-muted-foreground">+{bill.attachments!.length - 3}</span>
    )}
    {/* Legacy fallback: original file not in bill_attachments */}
    {(!bill.attachments || bill.attachments.length === 0) && bill.file_name && (
      <button onClick={() => openBillAttachment(bill.file_path, bill.file_name)}
        className={`${getFileIconColor(bill.file_name)} transition-colors p-1`}>
        {(() => { const Icon = getFileIcon(bill.file_name); return <Icon className="h-4 w-4" />; })()}
      </button>
    )}
  </div>
</TableCell>
```

The delete button on the Files cell will be removed from this table view (users manage attachment add/delete inside the Edit dialog). The existing `deletingAttachmentBill` / `handleDeleteAttachment` state and the `DeleteConfirmationDialog` for the single-file delete can remain or be removed cleanly — since the new flow handles deletion inside the Edit dialog.

### Files Changed

- `src/components/bills/BatchBillReviewTable.tsx` — update `PendingBill` interface, Files cell rendering, and post-dialog-close re-fetch
- `src/components/bills/BillsApprovalTabs.tsx` — fetch `bill_attachments` alongside lines when building `batchBills`
