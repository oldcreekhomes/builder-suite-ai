
## Root Cause: Table Width Never Exceeds Container, So Scroll Never Activates

After deep analysis of the full component chain, here is the definitive root cause:

The `<Table>` component renders a scrollable `<div class="relative w-full overflow-auto">` wrapping a `<table class="w-full ...">`. The `w-full` on the `<table>` means it sizes to 100% of its scroll container — it never grows wider than the container, so `overflow-auto` has nothing to scroll and the rightmost columns (PO Status, Cleared, Actions) are squeezed off-screen/invisible.

The fix for every other table in the app that works is: either the table has fewer columns (Review/Rejected fit), or an explicit `min-width` is set on the table so it is forced to be at least X pixels wide, making the scroll container activate.

The solution is to add `className="min-w-[1200px]"` directly to the `<Table>` component inside `BillsApprovalTable.tsx`. This forces the `<table>` element to be at least 1200px wide regardless of its container, which causes the `overflow-auto` on the scroll-container div to activate and show a horizontal scrollbar — revealing all columns including PO Status, Cleared, and Actions.

### Exactly What Changes

**File: `src/components/bills/BillsApprovalTable.tsx`** — line 599

```tsx
// BEFORE (current state):
<Table>

// AFTER (fix):
<Table className="min-w-[1200px]">
```

That is the **only** change needed. This is the standard pattern for wide tables — it tells the browser: "this table is at least 1200px wide," forcing the parent `overflow-auto` container to create a scrollbar when the viewport is narrower.

### Why Previous Fixes Didn't Work

All previous attempts fixed the wrong layer:
- Adding/removing `overflow-hidden` on the outer wrapper div changes clipping behavior of the rounded corners but doesn't affect whether the inner table can scroll
- Adding `min-w-0` to flex containers helps flex children shrink but doesn't force the table to be *wider* than the container

The missing piece was always: **the table needs an explicit minimum width so `overflow-auto` has content to scroll**.

### Single File Changed

- **`src/components/bills/BillsApprovalTable.tsx`** line 599: add `className="min-w-[1200px]"` to `<Table>`
