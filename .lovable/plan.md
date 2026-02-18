
## Restore Hidden Columns on Paid Bills Table

### Root Cause

The `BillsApprovalTable.tsx` wraps the `<Table>` in a `<div className="border rounded-lg">` container (line 598). This container has **no overflow handling**, which means when the table is wider than the visible area, the right-side columns are silently clipped — they render but are hidden behind the border box edge.

The columns that are being cut off for the Paid tab are:
- **PO Status** (`w-20`)
- **Cleared** (renders as the "final column" for paid status, `w-24`)
- **Actions** (shown when `canShowDeleteButton` is true for users with delete permission, `w-16`)

The columns themselves and their rendering logic are **intact** — nothing was deleted. It's purely a CSS overflow/clipping issue introduced when the `border rounded-lg` wrapper was added to match the standardized table style.

### Fix

Add `overflow-hidden` to the outer wrapper div so the Table's built-in `overflow-auto` inner scroll container operates correctly within the rounded border, and the right-side columns become visible and scrollable.

```tsx
// Line 598 — BillsApprovalTable.tsx
// Before:
<div className="border rounded-lg">

// After:
<div className="border rounded-lg overflow-hidden">
```

### Why `overflow-hidden` (not `overflow-x-auto`)?

The `Table` component (`src/components/ui/table.tsx` line 16) already wraps the `<table>` in `relative w-full overflow-auto`. So horizontal scrolling is already handled internally. Adding `overflow-x-auto` to the outer div would create a double-scrollbar. Adding `overflow-hidden` instead tells the outer border box to clip to its own rounded corners and let the inner scroll container do its job — this is the same pattern used in `EditExtractedBillDialog` and other standardized tables.

### File Changed

- **`src/components/bills/BillsApprovalTable.tsx`** — one line change on line 598.

No logic, column visibility conditions, or data is changed. This is a pure CSS fix.
