
## Restore Missing Columns on the Paid Bills Table

### Root Cause

In `src/components/bills/BillsApprovalTable.tsx` at **line 598**, the table wrapper div is:

```tsx
<div className="border rounded-lg">
```

It is missing `overflow-hidden`. Without it, the browser's rounded-corner clipping does not engage properly — the `<Table>` component's internal `overflow-auto` scroll container (from `src/components/ui/table.tsx`) cannot scroll horizontally within the border box. The rightmost columns (PO Status, Cleared, Actions) exist in the DOM but are visually clipped/hidden by the border box boundary.

### The Fix

Add `overflow-hidden` to line 598:

```tsx
// Before (line 598):
<div className="border rounded-lg">

// After:
<div className="border rounded-lg overflow-hidden">
```

This is the **same pattern** used in `EditExtractedBillDialog.tsx` and all other standardized tables in the application. `overflow-hidden` tells the outer div to clip to its own rounded corners, while the inner `Table`'s built-in `overflow-auto` container handles horizontal scrolling — allowing all columns (PO Status, Cleared, Actions) to be visible and scrollable.

### Why Only One Line

The columns themselves are intact and rendering correctly:
- `PO Status` — line 700–702
- `Cleared` / `Actions` — line 704–706
- `Pay Bill` — line 707–709
- `Actions` (delete) — line 710–713

No column logic needs to change. This is a pure one-word CSS fix.

### File Changed

- **`src/components/bills/BillsApprovalTable.tsx`** — line 598, add `overflow-hidden` to the wrapper div class.
