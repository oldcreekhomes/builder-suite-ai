# Compact lot splits in Enter Multiple Checks

## Requested change

Keep each check on **one visible row**, even when divided across many lots. Match the **Address** display in Manage Bills: show **+2**, **+19**, etc., with the allocation breakdown on hover.

## Changes

1. **Collapse split rows in the entry table.** Show the check’s full amount once, not a separate row and amount for each lot. Leave unrelated checks separate, even when their project and payee match.
2. **Reuse the Manage Bills hover pattern.** In Address, display the number of distinct allocated lots. Hover shows the cost code/account, each lot’s name and amount in lot order, and the check total. Single-lot checks retain their address selector. Long breakdowns remain accessible without overflowing the screen.
3. **Preserve editing and existing work.** Shared fields, attachments, and deletion apply to the whole check. Editing its total redistributes the split using the existing cent-precise allocation rule. Already-split saved drafts display compactly without losing their current allocations. Navigation away and back preserves the draft and attached files as it does now.
4. **Keep saving unchanged.** One split group still saves as one check with a detail line for each lot; no change to posting, accounting, batch history, or either dashboard’s access to this shared screen.

## Technical details

- `MultiCheckTable.tsx` currently expands split groups into separate entry rows, then groups them back together when saving. Derive the visible rows from the same `splitGroupId`, retaining underlying allocations and existing save payloads.
- Follow the tooltip structure in `BillsApprovalTable.tsx`; do not redesign Manage Bills or add database changes.
- Verify a two-lot and a 19-lot split: one visible check row, correct count and breakdown, full amount preserved, working edits/files, and draft restoration after navigation. Add focused tests for grouping and cent-precise redistribution; confirm saved detail lines sum to the check total.