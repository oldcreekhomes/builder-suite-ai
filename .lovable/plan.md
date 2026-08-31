# Make the Reconciliation Review dialog readable

## Problem

In the Reconciliation Review dialog the right side is cut off: the Amount column and the section "Total:" are clipped, so you can't read the numbers at all. The table is wider than the dialog, and nothing constrains the wide text columns (Payee, Description, Reference, Cost Code), so they push Amount off the edge instead of truncating.

## Fix

1. Widen the dialog to use most of the screen (roughly 95% viewport width, capped at a large max) instead of the current fixed `max-w-6xl`.
2. Give both tables fixed column layout with explicit widths, so every column stays in view no matter how long the text is:
   - Debits table: Date, Type, Payee, Description, Reference, Cost Code, Amount — Amount pinned to a fixed right-hand width.
   - Credits table: Date, Type, Source, Description, Amount.
3. Truncate long text (Payee, Description, Reference, Cost Code) with ellipsis, keeping the existing hover tooltips for the full description and cost code breakdown.
4. Keep the Amount column right-aligned and never wrapping/clipping; keep the section "Total:" fully visible by reserving room for the vertical scrollbar.
5. Verify in the running preview at a normal desktop width that both tables show Date through Amount with no horizontal clipping.

## Technical detail

UI-only change in `src/components/transactions/ReconciliationReviewDialog.tsx`: adjust the `DialogContent` width classes, switch the two tables to `table-fixed` with `<colgroup>`/width classes on the headers, replace the ad-hoc `max-w-[...]` cell classes with truncation, and add right padding so the scroll area doesn't overlap the totals. No data, query, or accounting logic changes.
