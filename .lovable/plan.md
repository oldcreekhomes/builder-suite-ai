
## Issue
The "Draw" badge looks different in the dialog vs. the table. Table version (preferred) is smaller/lighter; dialog version is bolder/larger.

## Root cause
`POStatusBadge` uses shadcn `Badge` with `variant="outline"`, which applies `text-xs font-semibold` from `badge.tsx`. The component then overrides with `text-xs px-2 py-0.5 font-normal`. In the table, the badge sits inside a small table cell that visually constrains it; in the dialog header (`DialogTitle`), it inherits the title's larger/bolder font styling, making the badge text appear heavier.

`DialogTitle` from shadcn typically applies `text-lg font-semibold` to its children context, and the badge's `<span>{config.label}</span>` doesn't pin its own font-size/weight, so it inherits.

## Plan
1. In `src/components/bills/PODetailsDialog.tsx`, wrap the `<POStatusBadge>` in the `DialogTitle` with a span that resets font sizing/weight to defaults (`text-xs font-normal`), OR move the badge outside `DialogTitle` so it doesn't inherit title typography.
2. Simplest approach: keep it in the header row but render it as a sibling of `DialogTitle` (inside the same flex container) instead of inside it. That isolates it from title font inheritance and matches the table's appearance exactly.

## Out of scope
- Restyling the badge component itself
- Other dialog content
