
## Show every bill line in the Cost Code hover tooltip

### Problem
On the Manage Bills tables, hovering the Cost Code column shows a popover that **groups bill lines by cost code** and rolls up amounts. For Bill INV0025 the four "4370: Framing Labor" lines collapse into a single `Lot 1: $2,700.00` row, hiding the four individual entries (`$800`, `$100`, `$1,000`, `$800`). The user wants the popover to mirror the Edit Extracted Bill dialog and the PO Status Summary — one row per bill line, in entry order.

### Fix

In `src/components/bills/BillsApprovalTable.tsx`, change `getCostCodeOrAccountData` (~lines 608–652) and its tooltip renderer (~lines 790–830).

**Data builder (`getCostCodeOrAccountData`):**
- Stop building the `costCodeMap` / `lotMap` aggregation.
- Iterate `bill.bill_lines` in their original order, producing one breakdown entry per line:
  ```
  { costCode, lotName, description, amount }
  ```
  - `costCode`: from `line.cost_codes` or `line.accounts` (same fallback as today).
  - `lotName`: from `line.project_lots` (same fallback as today; "Unassigned" when missing).
  - `description`: `line.memo` or `line.description` (trimmed; empty allowed).
  - `amount`: `line.amount || 0`.
- Keep `display` collapsed-cell text rules unchanged:
  - 0 lines → `'-'`.
  - 1 line → that line's `costCode`.
  - >1 line → `+${count}` (where `count` is number of bill lines, not unique cost codes).
- Keep `totalAmount = bill.total_amount` (authoritative).
- Add `bill_lines` to the SELECT in `BillsApprovalTable` query so `memo` / `description` are available — they may already be present; verify and add only if missing (no schema change either way).

**Tooltip renderer (the `<TooltipContent>` block at 801–825):**
- Render one row per breakdown entry, preserving order. Each row shows:
  - Left: `costCode` — `description` (or just `costCode` when description is empty); small muted "Lot: {lotName}" beneath when `lotName` is meaningful.
  - Right: line `amount` formatted with the standard 2-fraction-digit currency.
- Footer row: `Total: {totalAmount}` (unchanged).
- Cap height with `max-h-80 overflow-y-auto` so very long bills still fit.
- Keep `max-w-xs` width, font sizes, and divider styling.

**Other call sites:**
- Line 1436/1440 only reads `display` from this helper for the consolidated paid-tab child rows. Behavior there is unchanged because `display` rules are preserved.
- The Address-column popover (`getLotAllocationData`, lines 654–702 / 922–960) is untouched — it intentionally groups by lot.
- `BatchBillReviewTable` (Review tab) already renders one row per line in its Cost Code tooltip and does not need changes.

### Verification
- Bill INV0025 Cost Code hover shows **5 rows** in entry order: `4370: Framing Labor — Outdoor shower / $800.00`, `… X brace / $100.00`, `… Exterior front stairs / $1,000.00`, `… EXT - Heat pump stand / $800.00`, `4410: Exterior Trim Labor — 3rd floor porch, front porch, lanai and carport / $2,500.00`, then `Total: $5,200.00`.
- Bills with a single line still display the cost code as collapsed-cell text and a plain tooltip.
- Address-column popover and the consolidated paid-tab display remain unchanged.
- No DB or other component changes.

### Files touched
- `src/components/bills/BillsApprovalTable.tsx` only.
