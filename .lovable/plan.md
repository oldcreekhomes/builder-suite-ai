
## Add Delete (×) Buttons to Attachment Icons in the "Enter with AI" Table

### What the User Wants

The screenshot shows the attachment icon style in the Edit Extracted Bill dialog — each file icon has a small red circular "×" badge in the top-right corner to remove it. The user wants that exact same pattern on the file icons shown in the Files column of the `BatchBillReviewTable`.

### Root Cause

The Files cell in `BatchBillReviewTable.tsx` (lines 887–924) renders plain `<button>` elements for each attachment with no delete affordance. The `EditExtractedBillDialog.tsx` wraps each icon in a `relative group` div and adds a second small `×` button absolutely positioned at `-top-1 -right-1`, backed by a `handleRemoveAttachment` function that deletes from both Supabase Storage and the `bill_attachments` table.

### What Changes — One File

**`BatchBillReviewTable.tsx`** — Files cell rewrite:

1. Add a `handleRemoveAttachment` function (at the component level) that:
   - Calls `supabase.storage.from('bill-attachments').remove([att.file_path])`
   - Calls `supabase.from('bill_attachments').delete().eq('id', att.id)`
   - Calls `onBillUpdate(billId, { attachments: bill.attachments?.filter(a => a.id !== att.id) })` to update parent state instantly
   - Shows a toast on success/error

2. Wrap each attachment icon in `<div className="relative group shrink-0">` matching the dialog exactly.

3. Add the `×` delete button inside the wrapper — identical markup to the dialog:
```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    handleRemoveAttachment(bill, att);
  }}
  className="absolute -top-1 -right-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
  title="Remove attachment"
  type="button"
>
  <span className="text-xs font-bold leading-none">×</span>
</button>
```

4. Keep the legacy fallback (single file from `pending_bill_uploads.file_name`) **without** a delete button, since that file is not in `bill_attachments` and can't be deleted the same way — this matches the dialog's `attachment.id !== 'legacy'` guard.

### Technical Details

The `handleRemoveAttachment` signature:
```ts
const handleRemoveAttachment = async (bill: PendingBill, att: { id: string; file_name: string; file_path: string }) => {
  try {
    await supabase.storage.from('bill-attachments').remove([att.file_path]);
    await supabase.from('bill_attachments').delete().eq('id', att.id);
    onBillUpdate(bill.id, {
      attachments: (bill.attachments || []).filter(a => a.id !== att.id)
    });
    toast({ title: "Attachment removed" });
  } catch (err: any) {
    toast({ title: "Error", description: err.message, variant: "destructive" });
  }
};
```

No new state, no dialog, no confirmation — deletions are immediate, identical to the Edit dialog's behavior.

### Files Changed

- `src/components/bills/BatchBillReviewTable.tsx` — add `handleRemoveAttachment`, update Files cell wrapper and add `×` button
