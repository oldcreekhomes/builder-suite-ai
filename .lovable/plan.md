# Repair the two broken Family Fire PO attachments

## Confirmed cause

On Family Fire PO `2026-2401N-0028` at 2401 N Potomac:

- The first two attachment records point to Storage objects that exist.
- The last two records point to object IDs `1782234407074-...` and `1782234408171-...`, and both return `404 Object not found` because those objects no longer exist.
- Matching replacement PDFs are present in the same PO Storage folder with the exact same file sizes:
  - `APPROVED Fixtures 2401 Updated 6-23.pdf` → existing object `1782397507993-...` (302,102 bytes)
  - `APPROVED Fixtures 2405 Updated 6-23.pdf` → existing object `1782397508759-...` (253,636 bytes)

The edit dialog currently deletes a file from Storage as soon as its red X is clicked, while the PO's saved attachment list is not updated until **Update Purchase Order** is clicked. Closing or canceling after the X therefore leaves a saved PO reference to an object that has already been deleted.

## Fix

1. Repair this PO's two broken attachment records so they point to the confirmed existing replacement PDFs, preserving the displayed filenames and the other two attachments.
2. Change PO attachment removal to be staged in the dialog:
   - Clicking X removes the attachment from the pending UI only.
   - Existing Storage objects are deleted only after the PO update succeeds.
   - Canceling or closing the dialog does not delete existing files.
   - A failed PO update keeps the existing Storage files intact.
3. Keep newly uploaded attachments and all PO line items, amounts, vendor, status, and email behavior unchanged.

## Verification

- Open all four attachments on PO `2026-2401N-0028` and confirm each returns a real PDF rather than a 404 response.
- Remove an attachment and cancel; reopen the PO and confirm the attachment still opens.
- Remove an attachment and update; reopen the PO and confirm it is gone from both the PO record and Storage.
