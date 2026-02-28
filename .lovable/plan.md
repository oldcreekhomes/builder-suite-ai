

## Standardize Budget Header Button Sizes and Styles

### Problem
The Budget page header has three visually inconsistent controls compared to the "+ Budget" and "Export PDF" buttons:

1. **Lock button** -- Uses a raw `<button>` with `p-1` padding instead of a shadcn `Button`. It appears smaller and lacks the border/height of the other buttons.
2. **Expand/collapse toggle** -- Uses `Button variant="outline" size="sm"` but is icon-only (no text label), making it visually narrower. Should use `size="icon"` with matching height or get a consistent icon-button treatment.
3. **Lot Selector dropdown** -- Uses the default `SelectTrigger` which renders at `h-10` (40px), while the buttons are `size="sm"` at `h-9` (36px). The font and padding also differ.

The goal: every control in the header row should have the same vertical height (`h-9`), the same border style, and the same font size (`text-sm`).

### Changes

**1. Lock button -- `src/pages/ProjectBudget.tsx`**
- Replace the raw `<button>` with a shadcn `<Button variant="outline" size="icon" className="h-9 w-9">` so it matches the outline border, `h-9` height, and hover style of the other buttons.
- Keep the colored Lock/LockOpen icons and the Tooltip wrapper.

**2. Expand/collapse toggle -- `src/components/budget/BudgetPrintToolbar.tsx`**
- Change `size="sm"` to `size="icon"` with an explicit `className="h-9 w-9"` so the icon-only button matches the height of the text buttons and appears square rather than a narrow pill.

**3. Lot Selector dropdown -- `src/components/budget/LotSelector.tsx`**
- Add `className="w-[200px] h-9 text-sm"` to the `SelectTrigger` so it matches the `h-9` height and `text-sm` font of the adjacent buttons.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/ProjectBudget.tsx` | Replace raw `<button>` lock with `<Button variant="outline" size="icon" className="h-9 w-9">` |
| `src/components/budget/BudgetPrintToolbar.tsx` | Change expand/collapse from `size="sm"` to `size="icon"` with `className="h-9 w-9"` |
| `src/components/budget/LotSelector.tsx` | Add `h-9 text-sm` to `SelectTrigger` className |

### Result
All controls in the Budget header row will share the same `h-9` vertical height, `text-sm` font, and outline border style -- visually identical to the "+ Budget" and "Export PDF" buttons.

