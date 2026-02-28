

## Fix Lot Selector Size and Font Consistency

### Problem
The Lot dropdown is visually too large compared to the "+ Budget" and "Export PDF" buttons. The fonts across controls are also inconsistent.

### Changes

**1. `src/components/budget/LotSelector.tsx`**
- Reduce the SelectTrigger width from `w-[200px]` to `w-[120px]` so it matches the compact size of adjacent buttons.
- The `h-9 text-sm` is already correct for height and font size, but add `font-medium` to match the button font weight.

**2. `src/components/budget/BudgetPrintToolbar.tsx`**
- The "Export PDF" button already uses `size="sm"` which includes `text-sm font-medium` from the button base. No change needed here -- it should already match "+ Budget".

### Result
The lot dropdown will be compact (same height, similar padding) and all text across the header controls will use the same `text-sm font-medium` styling, matching the "+ Budget" button exactly.

