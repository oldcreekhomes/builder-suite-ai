Rewrite the `BreakdownCell` hover popover in `src/components/transactions/ReconciliationReviewDialog.tsx` so it visually matches the Bank Register's "Included Bills" tooltip exactly.

**Match target (from Bank Register)**
- Trigger text: `first label` + muted `+N` (no pill/badge, no underline).
- Tooltip content: `side="bottom"`, `align="start"`, `max-w-xs`.
- Header: bold `Included Cost Codes:` (for cost-code column) at `text-xs`, `mb-2`.
- Rows: `flex justify-between gap-4 text-xs`; label truncated at `max-w-[150px]`; amount right side.
- Total: `border-t pt-1 mt-1 flex justify-between gap-4 text-xs font-medium`.
- No inner `<table>`, no uppercase muted title, no rounded pill for the `+N`.

**Changes**
- Replace the current pill/table markup in `BreakdownCell` with the div/flex layout above.
- Header text becomes configurable via the existing `title` prop (caller in cost-code column passes `"Included Cost Codes"` → rendered as `Included Cost Codes:`).
- Keep the single-item and empty-fallback behavior unchanged.

No other files change.
