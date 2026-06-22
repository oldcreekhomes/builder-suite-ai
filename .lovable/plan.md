## Goal

Add a "divide by lots" button to each row on the **Journal Entry → Job Cost** tab, mirroring the Manage Bills behavior. Clicking it splits that line's debit/credit evenly across every lot in the project, creating one journal line per lot (with the remainder placed on the last lot for penny-precision).

## Where

`src/components/journal/JournalEntryForm.tsx` (Job Cost tab table only — Chart of Accounts tab and Expenses are untouched, no business-logic changes elsewhere).

## Changes

1. **Imports** — add `Divide` from `lucide-react`; add `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`.

2. **New handler `splitJobCostLineEvenly(lineId)`**
   - Guard: only runs when `lots.length >= 2` and the line has a non-zero debit OR credit (not both).
   - Compute per-lot amount: `floor(total / lots.length * 100)/100`; remainder on the last lot so the sum is exact.
   - Replace the source line with N new lines (one per lot), each carrying:
     - Same `cost_code_id`, `cost_code_display`, `memo`.
     - `lot_id` set to that lot.
     - `debit` or `credit` populated (whichever the source row used); the other field empty.
   - Preserve row order (slice-in like `splitRowEvenly` in `ManualBillEntry.tsx`).
   - Toast: `Split $X.XX evenly across N addresses`.

3. **Table layout (only when `showAddressColumn` is true)**
   - Shrink the Cost Code column from `400px` to `340px` to make room.
   - Add a new header `<th>` between Address and Action, width `w-12`, centered, no visible label (matches the bills row spacing) — header cell rendered only when `showAddressColumn` is true.
   - Add a new `<td>` in each row (only when `showAddressColumn`) containing a ghost icon button with the `Divide` icon, wrapped in a Tooltip "Split evenly across all addresses".
     - Disabled when `lots.length < 2`, when the row already has a `lot_id`, or when both debit and credit are 0/empty.
     - `onClick={() => splitJobCostLineEvenly(line.id)}`.
   - The existing Action cell (trash + `+`) is unchanged and stays on the far right.

4. **No changes** to save logic — split rows already flow through the existing `jobCostLines` save path (each line saves with its `lot_id`, debit, credit, cost_code_id) used by `handleSave`.

## Verification

- Open a 6-lot project's Journal Entry → Job Cost tab; the new Divide icon appears between Address and the trash button.
- Enter a debit of $600 with no lot selected → click Divide → six rows appear, each $100 (last row absorbs any cent remainder), each with a distinct lot pre-selected.
- Same flow with a credit-only row produces six credit lines.
- Button is disabled if a lot is already chosen on the row, or both debit and credit are empty/zero.
- Cost Code column is slightly narrower but the input still renders correctly.
- Chart of Accounts tab is unchanged.