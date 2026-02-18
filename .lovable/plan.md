
## Fix: Edit Extracted Bill — Move Attachments & Internal Notes to Row 2

### What's Wrong

The "Edit Extracted Bill" dialog currently uses a 3-column grid, placing Attachments and Internal Notes in a third row below Due Date and Reference No. The "Enter Manually" form correctly shows all 4 fields on one row: **Due Date | Terms | Attachments | Internal Notes**.

The goal is to match the exact layout shown in the reference screenshot.

### Target Layout

```text
Row 1: [ Vendor (col 1) ]  [ Bill Date (col 2) ]  [ Terms (col 3) ]  [empty col 4]
Row 2: [ Due Date (col 1) ] [ Reference No. (col 2) ] [ Attachments (col 3) ] [ Internal Notes (col 4) ]
```

### What Will Change

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

1. Change the grid from `grid-cols-3` to `grid-cols-4` on the header info wrapper div (line ~773).

2. **Row 1** — Add an empty 4th column `<div />` spacer after Terms, so Vendor/Bill Date/Terms occupy cols 1–3 and col 4 is blank.

3. **Row 2** — Keep Due Date (col 1) and Reference No. (col 2) as-is. Remove the existing `<div />` spacer that was col 3. Attachments and Internal Notes now become cols 3 and 4 respectively — moved up from the old Row 3.

4. **Delete the old Row 3** block entirely (the `col-span-2` Attachments div and the Internal Notes div that followed it).

5. The Attachments column in Row 2 will show:
   - The file icon (if a file exists) with its × delete button
   - An "Add File" button (matching the Enter Manually style — full-width outline button labeled "Add Files")
   - The hidden file input

6. The Internal Notes column in Row 2 will show:
   - Label "Internal Notes"
   - A full-width outline button labeled "Add Internal Notes" / "View Notes"

This is a pure layout restructure — no logic changes, all existing file upload, delete, and notes functionality remains identical.
