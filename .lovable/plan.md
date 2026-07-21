## Goal
Add a small grey up/down sort arrow to the **Description** column header in the **PO Status Summary** dialog so the user can optionally sort rows by description. The default sort by cost code remains unchanged.

## Current state
- `src/components/bills/BillPOSummaryDialog.tsx` groups bill lines by PO/cost-code/memo and currently sorts the grouped rows by cost code only.
- The app already uses `ArrowUpDown` from `lucide-react` for column sorting elsewhere (e.g. `BillsApprovalTable.tsx`).

## Changes
1. **State**
   - Add local state `descriptionSort: 'asc' | 'desc' | null` (default `null`, meaning cost-code sort is active).

2. **Header UI**
   - In the **Description** `TableHead`, add a small grey `ArrowUpDown` icon button to the right of the label.
   - Use the same styling as other sort toggles in the app (`h-3 w-3 text-muted-foreground`).
   - Clicking toggles: `null → asc → desc → null`.
   - When `descriptionSort` is active, optionally show `ArrowUp` or `ArrowDown` instead of `ArrowUpDown`.

3. **Sort logic**
   - Keep the existing cost-code sort as the default.
   - When `descriptionSort` is set, sort `sortedGroups` by the representative line's description (`memo`) ascending/descending.
   - Cost-code sort remains stable as the fallback.

4. **No other changes**
   - Do not alter the grouping, totals, tooltips, status badges, file cells, or any other column behavior.

## Files to edit
- `src/components/bills/BillPOSummaryDialog.tsx`

## Verification
- Open the PO Status Summary dialog.
- Confirm rows still default to cost-code order.
- Click the grey arrow on Description and confirm rows reorder alphabetically by description.
- Click again to reverse order; click a third time to return to cost-code order.