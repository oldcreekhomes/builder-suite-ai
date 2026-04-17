
## Issue
The header-only PO fallback row in `PODetailsDialog` hardcodes `description: 'Purchase Order Total'`. User wants it to reflect the bill line description (e.g., "Plumbing the groundworks") instead.

## Where it lives
`src/components/bills/PODetailsDialog.tsx` — the synthetic line item built when `realLineItems.length === 0`.

## Source of the description
`pendingBillLines` is already passed into the dialog and includes `memo` per line. For header-only POs, all pending bill lines on this dialog belong to this single PO, so we can derive the description from those memos.

## Plan
1. In `PODetailsDialog.tsx`, when building the header-only fallback line:
   - If `pendingBillLines` exists and has entries, set `description` to the joined unique non-empty `memo` values (comma-separated).
   - Fallback to PO header description if available, else `'—'` (drop the misleading "Purchase Order Total" string).
2. No other changes — the "Total" row label below stays as "Total".

## Out of scope
- Real PO line items (those already show their own description).
- Changing PO header storage.
