
## Root Cause: `overflow-hidden` Is Clipping the Table's Scroll Area

The `overflow-hidden` added to the outer `<div className="border rounded-lg overflow-hidden">` is the direct cause. Here is exactly why:

The `Table` component (`src/components/ui/table.tsx`) wraps every `<table>` in an internal scrollable div with `relative w-full overflow-auto`. When the outer parent has `overflow-hidden`, the browser clips the **entire child element** — including its internal `overflow-auto` scroll container — to the parent's bounding box. The result: columns that would normally be accessible via horizontal scroll are simply hidden and unreachable.

This is NOT a column rendering bug. The PO Status, Cleared, and Actions columns are in the DOM. They are being cut off by the CSS.

### The Fix

Remove `overflow-hidden` from the outer wrapper div. Instead, move the `border rounded-lg` styling into the `containerClassName` prop of the `<Table>` component itself. Since `containerClassName` is the div that directly wraps the `<table>`, the border and rounded corners will be applied at the scroll-container level — where they belong.

```tsx
// BEFORE (line 598–599 in BillsApprovalTable.tsx):
<div className="border rounded-lg overflow-hidden">
    <Table>

// AFTER:
<div>
    <Table containerClassName="relative w-full overflow-auto border rounded-lg">
```

This means:
- The border and rounded corners sit on the scroll container itself
- Horizontal scroll works correctly — users can scroll right to see PO Status, Cleared, and Actions
- No double-scroll, no clipping

### File Changed

- **`src/components/bills/BillsApprovalTable.tsx`** — lines 598–599 only.
  - Remove `overflow-hidden` from the outer div (or simplify it to just `<div>`)
  - Add `containerClassName="relative w-full overflow-auto border rounded-lg"` to `<Table>`
