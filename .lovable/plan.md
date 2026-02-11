

# Fix: A/P Aging Report Per-Lot Amount Calculation

## Problem

When you select Lot 1 or Lot 2, the report shows the **full bill amount** for every bill instead of just that lot's portion. This happens because the code uses `bill.total_amount` (the whole bill) regardless of which lot is selected. Since every bill now has lines for both lots (50/50 split), both lots show identical totals equal to the full project total.

## Root Cause

The query fetches `bill_lines(lot_id)` but does NOT fetch the `amount` from each line. The open balance calculation always uses `bill.total_amount - bill.amount_paid`, which is the full bill amount.

## Solution

### File: `src/components/reports/AccountsPayableContent.tsx`

1. **Fetch line amounts**: Change the `bill_lines` select from `bill_lines(lot_id)` to `bill_lines(lot_id, amount)` so we have per-line amounts.

2. **Update the `BillWithVendor` interface**: Add `amount` to the `bill_lines` type: `bill_lines: { lot_id: string | null; amount: number }[]`.

3. **Calculate lot-specific amounts**: When a specific lot is selected (not "Total"), instead of using `bill.total_amount`, sum only the `bill_lines` amounts where `lot_id` matches the selected lot. This becomes the bill's effective `total_amount` for that lot view.

4. **Pro-rate payments**: When viewing a specific lot, the payment amount should also be pro-rated. Calculate the lot's share as a ratio: `(lot line total / bill total_amount) * amount_paid`. This ensures that if a bill is half-paid, each lot shows half of that payment proportionally.

5. **Open balance per lot**: The per-lot open balance becomes: `lotLineTotal - (lotLineTotal / billTotal * amountPaid)`.

### Summary of the math:
- **Total view**: `openBalance = bill.total_amount - amountPaid` (unchanged)
- **Lot view**: `lotAmount = sum of bill_lines.amount where lot_id = selectedLotId`, then `openBalance = lotAmount - (lotAmount / bill.total_amount * amountPaid)`

This ensures Lot 1 shows exactly half the costs and Lot 2 shows the other half, and both add up to the Total.

