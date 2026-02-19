
## The Definitive Fix — After Reading Every Relevant Line

### What the Code Actually Does

The `Table` component in `table.tsx` has this structure:
```
<div class="relative w-full overflow-auto">   ← scroll container (from containerClassName default)
  <table class="w-full min-w-[1200px] ...">   ← the actual table
```

The current `BillsApprovalTable.tsx` (lines 596-599) renders:
```tsx
<div className="flex flex-col min-w-0">
  <div className="border rounded-lg min-w-0">
    <Table className="min-w-[1200px]">
```

### Why It Still Fails

`className="min-w-[1200px]"` on `<Table>` applies to the `<table>` HTML element. The `<table>` also has `w-full` (applied inside `table.tsx` line 21). These two conflict:

- `w-full` = 100% of its parent (the scroll container div)
- `min-w-[1200px]` = floor of 1200px

When the scroll container div is itself `w-full` of an unconstrained parent, both the `<table>` AND the scroll container expand together — the scroll container never gets "smaller than its content," so `overflow-auto` has nothing to scroll.

The fix must be applied to the **scroll container div itself**, not the `<table>`. The scroll container needs a fixed/constrained width so it's smaller than the 1200px content inside it.

### The Correct Fix

Pass `containerClassName` to constrain the scroll container div to the available width while letting the `<table>` be wider:

```tsx
// BEFORE (broken — min-width on table element, scroll container expands with it):
<Table className="min-w-[1200px]">

// AFTER (correct — scroll container is constrained, table content forces horizontal scroll):
<Table 
  containerClassName="relative w-full overflow-x-auto"
  className="min-w-[1200px]"
>
```

Then the outer structure:
```tsx
<div className="flex flex-col min-w-0">
  <div className="border rounded-lg overflow-hidden">
    <Table
      containerClassName="relative w-full overflow-x-auto"
      className="min-w-[1200px]"
    >
```

Using `overflow-x-auto` (instead of `overflow-auto`) on the scroll container ensures only horizontal scrolling is enabled at the table level, which is the correct behavior for a data table. The `overflow-hidden` on the border wrapper clips rounded corners cleanly.

### Exactly Two Lines Changed in `BillsApprovalTable.tsx`

**Line 598** — add `overflow-hidden` back to the border wrapper:
```tsx
// FROM:
<div className="border rounded-lg min-w-0">
// TO:
<div className="border rounded-lg overflow-hidden">
```

**Line 599** — add `containerClassName` to `<Table>`:
```tsx
// FROM:
<Table className="min-w-[1200px]">
// TO:
<Table containerClassName="relative w-full overflow-x-auto" className="min-w-[1200px]">
```

This is the pattern recommended in the project's own memory note (`style/standardized-table-ui-shadcn`, rule 8): *"the Table must be passed `containerClassName='relative w-full'` to disable its default internal overflow"* — except here we want `overflow-x-auto` specifically to enable horizontal scrolling at exactly the right level.

### Why All Previous Attempts Failed

| Previous Attempt | Why It Failed |
|---|---|
| `overflow-hidden` on border wrapper alone | Clipped the scroll container entirely — no scroll possible |
| `min-w-[1200px]` on `<Table>` (className) | Applied to `<table>` element, but scroll container expanded with it |
| `min-w-0` on flex containers | Only prevents flex children from overflowing outward; doesn't constrain the table scroll container |
| Removing `overflow-hidden` | Border rounding still doesn't work; scroll container still not constrained |

The key insight: the scroll container div (`containerClassName`) must be the element with the **constrained width**, so `overflow-auto` activates. The `<table>` inside must have the **minimum width** to force overflow. These are two separate elements — the fix requires setting both.

### Files Changed

- **`src/components/bills/BillsApprovalTable.tsx`** — lines 598–599:
  - Line 598: `<div className="border rounded-lg overflow-hidden">`
  - Line 599: `<Table containerClassName="relative w-full overflow-x-auto" className="min-w-[1200px]">`
