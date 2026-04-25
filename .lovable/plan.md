Two small fixes to `src/components/CreatePurchaseOrderDialog.tsx`:

### 1. Attachment chips → compact icon style with X (matching the rest of the app)

Today (lines 645–659), each uploaded file renders as a full-width `bg-muted` row with `FileText` + filename + X. Because the parent column is only 1/3 wide, long bid filenames overflow the column and visually "spill out" under the form.

Change to the standard compact chip pattern used elsewhere (e.g., `SendSingleCompanyEmailModal`, `SendBidPackageModal`):

- Wrap chips in `flex flex-wrap gap-1.5` so multiple files wrap inside the column.
- Each chip: small inline-flex pill with a colored file icon (use `getFileIcon` + `getFileIconColor` from `src/components/bidding/utils/fileIconUtils.ts`), the **clean** filename via `getCleanFileName` (so `proposal_<uuid>_<ts>_Gray-214 N Granda-EHO.pdf` shows as `Gray-214 N Granda-EHO.pdf`), `truncate max-w-[180px]`, and a small `X` button on the right to remove.
- Remove the full-width `bg-muted rounded-md p-1.5` row styling.

### 2. Footer column heights — revert to the original sizing

Last round I incorrectly grew Attachments + Sending To to `h-[96px]` and shrank Custom Message. The user wants the **opposite**: keep Attachments + Sending To at their original size and shrink the Custom Message Textarea to match.

- **Attachments dropzone (line 633):** `h-[96px]` → `h-[80px]` (back to its original `min-h-[80px]` visual size).
- **Sending To box (line 663):** `h-[96px]` → `h-[80px] overflow-auto`.
- **Custom Message Textarea (line 626):** `h-[96px] min-h-[96px]` → `h-[80px] min-h-[80px]` so its bottom edge lines up with the other two boxes.

The chips render *below* the 80px dropzone (wrapped, compact) and don't push the dropzone height — so the three box bottoms still align.

### Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` (only)

### Not changing
- No mutation, edge function, or DB changes.
- No changes to columns/labels/buttons.
- Trash icon stays red; Extra checkbox stays black.