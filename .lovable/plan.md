

## Revert "Paid" Column, Add Tooltip on Amount Instead

### What changed
The separate "Paid" column is confusing. Instead, the existing **Amount** column on the Paid tab should show the **net cash paid** (e.g., $50.00) with an info tooltip when credits were involved, explaining the breakdown (Bill: $200, Credit: -$150, Cash Paid: $50).

### Changes to `src/components/bills/BillsApprovalTable.tsx`

1. **Remove the "Paid" column header** (line 788-790) and **cell** (lines 926-969)

2. **Remove `isPaidStatus` from `baseColCount`** (line 686) — drop the `+ (isPaidStatus ? 1 : 0)`

3. **Keep the `paymentBreakdowns` query** (lines 306-389) — this data is still needed

4. **Modify the Amount cell** (lines 916-925): For paid bills with credits applied, show the net cash paid amount instead of `total_amount`, and attach the info tooltip with the breakdown (Bill Amount, Credits Applied, Cash Paid). For paid bills without credits, show `total_amount` as before. Non-paid tabs remain unchanged.

Essentially the tooltip content that was in the "Paid" column cell moves onto the Amount cell, and the displayed value changes from `bill.total_amount` to `breakdown.cashPaid` when credits exist.

