## Plan

Three small UI tweaks in `src/components/CreatePurchaseOrderDialog.tsx`:

1. **Shrink Quantity column** — reduce the Quantity column width from `w-[100px]` to `w-[60px]` (about half), freeing horizontal space for the Description field, which already uses the remaining flexible width.

2. **Move Amount closer to Extra** — narrow the Amount column from `w-[110px]` to `w-[90px]` and right-align it so the dollar value sits next to the Extra checkbox rather than leaving a large gap. The Subtotal row's amount cell will get the same right-alignment to stay consistent.

3. **Add inline "+" Add Line button in Actions column** — add a small ghost "+" icon button next to the trash icon on each line row so the user can add a new line without scrolling down. Remove the separate "Add Line" button below the table. Keep the locked-state tooltip behavior ("PO already sent — create a new PO for additional work.") on the inline + button when `isLocked` is true.

### Technical details

- File: `src/components/CreatePurchaseOrderDialog.tsx`
- Header column widths: change `Quantity` head from `w-[100px]` to `w-[60px]`, `Amount` head from `w-[110px]` to `w-[90px] text-right`.
- Amount body cell: change `pl-3` to `text-right pr-3`.
- Subtotal row: change colSpan and alignment to match new layout (`Subtotal` label right-aligned in col 4, amount right-aligned in col 5).
- Actions cell: wrap trash button and a new `Plus` icon button in a `flex items-center justify-center gap-1` container. The + button calls `addLine()` and is disabled / tooltip-wrapped when `isLocked`.
- Delete the standalone `Add Line` / locked-tooltip block beneath the table (lines ~798–813).