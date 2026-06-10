## Fix

In `src/components/bills/BillsApprovalTable.tsx`, the bill row is clickable and opens the **PO Status Summary** dialog. The Pay Bill button's `TableCell` (around line 1244-1255) does not stop click propagation, so clicking "Pay Bill" both opens the Pay Bill dialog and triggers the row's PO Summary dialog.

Add `onClick={(e) => e.stopPropagation()}` to that `TableCell` (matching the pattern already used by the Delete button cell on line 1257) and also call `e.stopPropagation()` inside the Button's `onClick`. One-file change.

Also check the matching expanded/child row Pay Bill cells around lines 1729 and 1988 and apply the same stop-propagation guard if they exist.
