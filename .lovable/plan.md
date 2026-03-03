

## Compact Allocation Mode Layout

The current allocation section stacks the two radio options vertically with detailed breakdown info beneath "Divide equally," consuming significant vertical space and causing a scrollbar.

### Change

**`src/components/budget/BudgetDetailsModal.tsx`** (lines 508-545):

Restructure the allocation section to place both options side-by-side in a horizontal layout:

- Use a 2-column grid (`grid grid-cols-2 gap-4`) for the two radio options
- Each option becomes a compact card-like cell
- For "Full amount": radio + label + single line showing the budget amount
- For "Divide equally": radio + label + compact inline summary (e.g., `$20,382.00 ÷ 19 = $1,072.73/lot`)
- Reduce padding from `p-4` to `p-3` and `space-y-3` to `space-y-2`
- Collapse the 3-row grid breakdown (Bid Total / Project Lots / Per Lot) into a single descriptive line

This eliminates roughly 50% of the vertical space used by the allocation section, removing the need for a scrollbar.

### File
1. `src/components/budget/BudgetDetailsModal.tsx` — restructure allocation mode to horizontal 2-column layout with inline details

