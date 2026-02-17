

## Add Green Highlight to "This Bill" Column Values

### What

Add `bg-green-100 text-green-700` styling to the "This Bill" column amounts in the line items table, matching the same green highlight style already used on Billed column values that belong to the current bill. This makes it immediately obvious which amounts are being billed.

### Changes

**File: `src/components/bills/PODetailsDialog.tsx`**

1. **Line item "This Bill" cells** (line 204): Change the span from `font-medium` to `bg-green-100 text-green-700 px-1 rounded font-medium` -- the same pattern used in `BilledAmountWithTooltip` for current-bill highlights.

2. **Totals row "This Bill" cell** (around line 247): Add the same `text-green-700` styling to the totals pending amount for consistency with the column above it.

### What stays the same

- Summary header labels and values (no highlight changes there per user request)
- Remaining column green/red logic
- All other styling and layout

