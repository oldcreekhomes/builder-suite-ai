# Plan: Click-to-open PO Status Summary on Paid-tab child rows

## Problem

On the Approved tab, clicking a bill row opens the **PO Status Summary** dialog (`BillPOSummaryDialog`) via `renderBillRow` — it sets `poDialogState` when the bill has PO matches and applies `cursor-pointer` to the row.

On the Paid tab, individual bills are rendered as **child rows under a consolidated payment header** (lines ~1657–1832 in `BillsApprovalTable.tsx`). Those child `<TableRow>`s have no `onClick` and no `cursor-pointer`, so clicking them does nothing.

## Change (single file, child-row only)

`src/components/bills/BillsApprovalTable.tsx`, the child-row `<TableRow key={\`alloc-…\`}>` at line 1657.

1. Before the row, compute the same row-click state as `renderBillRow`:
   - `const childMatchResult = childBill ? poMatchingData?.get(childBill.id) : undefined;`
   - `const childAllMatches = childMatchResult?.matches || [];`
   - `const childRowClickable = !!childBill && childAllMatches.length > 0;`

2. Update the row element:
   - `className={\`h-11 \${childRowClickable ? 'cursor-pointer' : ''}\`}`
   - `onClick={childRowClickable ? () => setPoDialogState({ open: true, matches: childAllMatches, bill: childBill! }) : undefined}`

3. Stop-propagation safety on interactive child cells so the row click doesn't double-fire when the user clicks a button/icon. Add `onClick={(e) => e.stopPropagation()}` to the cells that already render their own interactive controls in the child row: Files cell, Notes button cell, PO Status cell, and the Lock/Actions cell. (The PO Status cell's inner `onClick` already calls `e.stopPropagation()`, but wrapping the `<TableCell>` keeps it consistent with the rest.)

No changes to data fetching, state, or the payment header row — `poMatchingData` is already loaded for every visible bill (including child bills in payment groups).

## Verification

- Paid tab → expand a multi-bill payment → click any child bill row: `BillPOSummaryDialog` opens for that specific bill, matching the Approved-tab behavior.
- Clicking the Files, Notes, PO Status badge, or Lock icon does NOT open the summary (handled by their cell-level `stopPropagation`).
- Bills with no PO matches stay non-clickable (no pointer cursor), same as Approved.
