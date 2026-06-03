## Add ÷ Split-Across-Addresses Button to Edit Bill Dialog

Mirror the existing "divide evenly across addresses" functionality from the **Enter Manually** tab (`ManualBillEntry.tsx` → `splitRowEvenly`) into the **Edit Bill** dialog (`EditBillDialog.tsx`).

### Where it goes
In the Job Cost table inside `EditBillDialog.tsx`, add a small ghost ÷ button (lucide `Divide`, `h-4 w-4`) next to the red trash icon in the Actions column. It only appears when:
- The project has more than one address (`showAddressColumn` / `lots.length > 1`)
- The row is a single ungrouped row (`singleRow` is truthy — already-grouped rows are skipped because they're already split across all lots)
- The bill is editable (Actions column is already gated by `!isApprovedBill`)
- The row has a positive amount and no lot already assigned (match Enter Manually's `disabled={!!row.lotId || amount <= 0}`)

Tooltip text: "Split evenly across all addresses" (same as Enter Manually).

### Behavior
Add a new helper `splitJobCostRowEvenly(rowId)` in `EditBillDialog.tsx` that copies the math from `ManualBillEntry.splitRowEvenly`:

1. Take the source row's `quantity * amount` as total value
2. Compute per-lot amount = `floor(total / lots.length * 100) / 100`, last lot gets the remainder so the cents reconcile
3. Replace the source row with N new `ExpenseRow` objects (one per lot), each with:
   - same `account`, `accountId`, `projectId`, `purchaseOrderId`, `memo`
   - `lotId` set to that lot
   - `quantity: '1'`
   - `amount` = per-lot amount (last row = remainder)
   - new `id` (e.g. `${rowId}_split_${lot.id}`)
   - no `dbId` — these are treated as new lines; the original `dbId` (if any) goes into `deletedLineIds` so the existing DB line is removed on save (matches how `removeJobCostRow` already works)
4. Toast "Split $X.XX evenly across N addresses"

Once saved, the dialog's existing `jobCostDisplayGroups` logic will automatically display them as one grouped row with "All N lots" / "$X /lot", exactly like the second screenshot.

### Expense tab
Not changed — expenses don't have an address column in Edit Bill.

### Files to edit
- `src/components/bills/EditBillDialog.tsx`
  - Import `Divide` from `lucide-react`
  - Add `splitJobCostRowEvenly` helper near `removeJobCostRow`
  - In the Actions `<TableCell>` (around lines 1076–1094), render the ÷ button before the trash button when `showAddressColumn && singleRow` is true, wrapped in a Tooltip
