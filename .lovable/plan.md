
## The Real Problem — Definitively Identified

After reading every relevant line, the root cause is now crystal clear.

### Why Nothing Has Worked

The `Table` component in `table.tsx` renders this structure:

```
<div class="{containerClassName}">    ← scroll container
  <table class="w-full {className}">  ← the table element
```

When `containerClassName="relative w-full overflow-x-auto"` is passed and `className="min-w-[1200px]"` is passed:

- The scroll container div becomes: `class="relative w-full overflow-x-auto"` — width is 100% of its parent
- The table element becomes: `class="w-full caption-bottom text-sm min-w-[1200px]"` — width is 100% of the scroll container (because `w-full` is already baked in and wins), but minimum 1200px

**The critical conflict:** `w-full` on the `<table>` means it's 100% of its parent (the scroll container). `min-w-[1200px]` means it can't go below 1200px. But when the scroll container is itself `w-full` and has no max-width or fixed width, the scroll container ALSO expands to 1200px+ to accommodate the table. A container can only scroll its children if the children are **wider than the container**. If the container expands with the content, `overflow-x-auto` never triggers.

Every fix attempt has been trapped in this same loop.

### The Definitive Solution — Two Options

**Option A (Simplest — skip the scroll entirely by removing min-widths and reducing column widths)**

The Paid tab has `showProjectColumn={false}`, which means it has fewer columns. Looking at the screenshot, the columns that show are: Vendor, Cost Code, Bill Date, Due Date, Amount, Reference, Memo, Address, Files, Notes — and then PO Status, Cleared, and Actions are cut off.

The real question is: **do these 13 columns actually need 1200px, or can they be displayed in less space?** Looking at the screenshot, there is clearly empty/wasted space in Reference and Cost Code columns. The table could fit all columns without scrolling if we reduced the oversized column widths.

**Option B (Correct scroll approach — make the border wrapper the scroll container)**

Instead of relying on the internal `Table` component scroll container, make the **outer border wrapper div** the scroll container directly — and give it an explicit `overflow-x-auto`. The Table inside should use `containerClassName="relative w-full"` (no overflow on it — the outer div handles scroll), and the `<table>` element should have `min-w-[1200px]`.

```tsx
// The border wrapper becomes the scroll container:
<div className="border rounded-lg overflow-x-auto">
  <Table containerClassName="relative w-full" className="min-w-[1200px]">
```

This works because:
- The border wrapper `div` has `overflow-x-auto` — IT is the scroll container
- Its width is determined by its parent (the flex column) — it is constrained to the viewport
- The `Table`'s internal container div is `relative w-full` — no overflow, it expands freely
- The `<table>` has `min-w-[1200px]` — it is wider than the border wrapper's viewport width
- Since the `<table>` is wider than the `border wrapper`, `overflow-x-auto` on the border wrapper triggers a scrollbar

**This is the correct approach** — the scroll container must be the outermost constrained div, not an inner div.

### Exact Change

**File: `src/components/bills/BillsApprovalTable.tsx`** — line 598-599:

```tsx
// CURRENT (broken):
<div className="border rounded-lg">
    <Table containerClassName="relative w-full overflow-x-auto" className="min-w-[1200px]">

// FIXED:
<div className="border rounded-lg overflow-x-auto">
    <Table containerClassName="relative w-full" className="min-w-[1200px]">
```

The scroll container changes from the **inner div** (inside Table component) to the **outer border wrapper div** — which IS properly constrained by its parent flex container. This makes `overflow-x-auto` work correctly, revealing PO Status, Cleared, and Actions columns.
