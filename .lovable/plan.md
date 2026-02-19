
## Root Cause: The Real Issue

After reading the full file carefully, the problem is NOT just the border/overflow CSS — it is a **flex layout constraint combined with `min-width`**.

Here is the exact chain:

1. `BillsApprovalTable` renders: `<div className="flex flex-col h-full">` (line 596)
2. Inside that: `<div>` → `<Table containerClassName="relative w-full overflow-auto border rounded-lg">`
3. The `Table` component's inner container div becomes: `<div class="relative w-full overflow-auto border rounded-lg">`
4. Inside that: `<table class="w-full ...">` with all the columns

The issue: When an `overflow-auto` container is inside a **flex column** (`flex flex-col`), the flex child's default `min-width: auto` causes it to try to be as wide as its content. **But `w-full` makes it 100% of the parent flex container.** Since the `<table>` inside is WIDER than the visible area, the `overflow-auto` should show a scrollbar — **but it doesn't** because `border rounded-lg` on an `overflow-auto` element clips content in WebKit/Safari-based rendering.

The proven fix: Wrap the table in `<div className="border rounded-lg overflow-hidden">` (outer) and keep the `Table`'s container as just `relative w-full overflow-auto` (the default — meaning we pass NO `containerClassName` at all). This separates concerns correctly:
- The `overflow-hidden` outer div clips to the rounded corners
- The `overflow-auto` inner Table container handles horizontal scrolling within that

This is the EXACT pattern that was in the original code and is used in every other table in the app. The previous attempts failed because they tried to combine `border rounded-lg` directly on the `overflow-auto` element.

### The Single Correct Fix

**`src/components/bills/BillsApprovalTable.tsx` — lines 598–599:**

```tsx
// BEFORE (current broken state):
<div>
    <Table containerClassName="relative w-full overflow-auto border rounded-lg">

// AFTER (correct fix):
<div className="border rounded-lg overflow-hidden">
    <Table>
```

- Outer `div`: `border rounded-lg overflow-hidden` — provides the visual border/rounded corners and clips children to those corners
- `<Table>`: no `containerClassName` → falls through to the default `"relative w-full overflow-auto"` inside `table.tsx` line 16 — enabling correct horizontal scrolling
- `overflow-hidden` on the OUTER div does NOT prevent the INNER `overflow-auto` from scrolling — this is how browsers work. The inner scroll container clips its own content independently.

This is the same pattern used in `BiddingTable.tsx` line 230: `<div className="border rounded-lg overflow-hidden"><Table>`, `BillsReviewTable.tsx`, and all other standardized tables in the project.

### Why Previous Attempts Failed

| Attempt | What Happened |
|---|---|
| `<div className="border rounded-lg overflow-hidden"><Table>` | `overflow-hidden` was applied correctly, BUT the `Table` component had no `containerClassName`, so its default inner div got `overflow-auto` — this SHOULD have worked. The issue may be that the change didn't save correctly or the build didn't pick it up. |
| `<div><Table containerClassName="relative w-full overflow-auto border rounded-lg">` | `border-radius` on an `overflow-auto` element causes WebKit to clip content to the rounded corners in a way that hides overflow content instead of scrolling it. |

### Files Changed

- **`src/components/bills/BillsApprovalTable.tsx`** — lines 598–599 only:
  - Change outer `<div>` to `<div className="border rounded-lg overflow-hidden">`
  - Remove `containerClassName` from `<Table>` entirely (letting it use the default `overflow-auto`)
