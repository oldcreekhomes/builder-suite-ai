## Fix the $154.84 / wrong-allocation regression

Restore the existing Nob Hill last-lot-remainder pattern that was working from Feb 6 → Apr 24, 2026, repair this Home Depot bill, and fix the Edit Bill tooltip.

### 1. Revert `supabase/functions/split-pending-bill-lines/index.ts`

Each split lot row will store:

- `amount` = per-lot allocated dollars
- `unit_cost` = per-lot allocated dollars
- `quantity` = 1
- last lot absorbs the cent remainder

So $154.83 across 2 lots becomes $77.41 + $77.42 = **$154.83** exactly.

### 2. Repair this Home Depot bill (`WK28976544`)

Bill is still `draft` (no journal entries posted), so no GL reversal needed.

- `bills.total_amount`: 154.84 → **154.83**
- Lot 1 line: `amount = 77.41`, `unit_cost = 77.41`, `quantity = 1`
- Lot 2 line: `amount = 77.42`, `unit_cost = 77.42`, `quantity = 1`

### 3. Fix the Edit Bill lot tooltip

In `src/components/bills/EditBillDialog.tsx` and `src/components/bills/EditExtractedBillDialog.tsx`, the tooltip currently renders the unit-cost field as the per-lot value. Change it to display the actual allocated lot amount (`quantity × unit_cost`, via the existing `rowTotal` helper), so a 2-lot $154.83 bill reads:

```text
Lot 1:   $77.41
Lot 2:   $77.42
Total:  $154.83
```

### Not changing

- `approve_pending_bill` RPC (already correct).
- Approved / posted / paid bill accounting behavior.
- Any other historical bills.