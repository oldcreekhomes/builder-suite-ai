

## Add "Approved" Stamp Overlay to PDF Preview in Confirm PO Dialog

### What the user wants
When viewing a proposal PDF from within the Confirm PO dialog (clicking the file icon), the PDF preview should show a visual "APPROVED" stamp on each page with:
- "APPROVED" text
- Project Manager's first and last name (signature style)
- The current date

This is a **preview-only CSS overlay** -- not actual PDF modification. It shows the user what the stamped version will look like before they click "Send PO".

### How it works

1. **Add optional stamp metadata to `UniversalFile`** -- a new `stampInfo` field with `{ managerName: string, date: string }`

2. **Pass stamp info from `ConfirmPODialog`** -- when the user clicks a proposal file, instead of calling `openProposalFile(fileName)`, call `openFile()` with `stampInfo` populated. The dialog already has `projectId`, so we fetch the project manager's name (using existing `construction_manager` field from projects + users table lookup) and pass it through.

3. **Render CSS overlay stamp in `PDFViewer`** -- when `stampInfo` is present on the file, render a positioned overlay div on each rendered PDF page containing:
   - Red semi-transparent bordered box (bottom-right corner)
   - "APPROVED" in bold red
   - Manager name in italic
   - Date below

### Files to modify

1. **`src/components/files/FilePreviewModal.tsx`** -- add `stampInfo` to `UniversalFile` interface
2. **`src/components/files/FilePreviewContent.tsx`** -- pass `stampInfo` to `PDFViewer`
3. **`src/components/files/PDFViewer.tsx`** -- accept `stampInfo` prop, render overlay stamp div on each page when present
4. **`src/components/bidding/ConfirmPODialog.tsx`** -- fetch project manager name, pass `stampInfo` when opening proposal preview

### Stamp visual design
- Bottom-right of each page, ~20px margin
- Red dashed border, white semi-transparent background
- "APPROVED" in bold red, ~14px
- Manager name in italic below, ~11px
- Date in regular text below, ~10px
- Rotated slightly (-5deg) for a stamp feel
- `pointer-events: none` so it doesn't interfere with PDF interaction

### No backend changes
This is purely a client-side preview overlay. The actual PDF stamping (modifying the file) will be a separate step when implementing the send flow.

