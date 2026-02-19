
## The Border Problem — Identified and Fixed in One Line

### Root Cause

The missing top border on the Review, Rejected, and Paid tabs is caused by a single CSS class on `BillsApprovalTable.tsx` line 600:

```tsx
<TableHeader className="sticky top-0 bg-background z-10">
```

The `sticky` positioning lifts the `<thead>` out of normal document flow and renders it on top of the container. When the browser paints this, the `<thead>` visually overlaps and covers the top border of the `<div className="border rounded-lg">` wrapper beneath it. The `bg-background` class (white background) on the sticky header then completely paints over that top border, making it invisible.

The **Approved** tab uses `PayBillsTable.tsx`, which has no `sticky` on its `TableHeader` — so the border shows correctly there.

### The Fix

**File: `src/components/bills/BillsApprovalTable.tsx`, line 600**

Remove `sticky top-0 bg-background z-10` from the `TableHeader`:

```tsx
// CURRENT (broken — sticky header covers the top border):
<TableHeader className="sticky top-0 bg-background z-10">

// FIXED (matches PayBillsTable pattern — top border visible):
<TableHeader>
```

This is the only change needed. It affects all three broken tabs simultaneously (Review, Rejected, and Paid), since they all render from the same `BillsApprovalTable` component.

### Why Sticky Was There (and Why Removing It Is Safe)

The `sticky` header was added to keep the column headers visible while scrolling through a long list. However, the tables are rendered inside the `ManageBillsDialog` which already has its own scroll container (`flex-1 overflow-auto`). The sticky behavior was cosmetically broken (hiding the top border) and is not needed — `PayBillsTable` works fine without it. Removing it matches the working Approved tab behavior exactly.

### Single Change Summary

| File | Line | Change |
|---|---|---|
| `src/components/bills/BillsApprovalTable.tsx` | 600 | `<TableHeader className="sticky top-0 bg-background z-10">` → `<TableHeader>` |
