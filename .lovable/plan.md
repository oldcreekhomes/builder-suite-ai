

## Fix: Payment Breakdown Calculation Uses Wrong Data Source

### Problem
The "Cash Paid" calculation on the Paid tab uses `payment.total_amount` from `bill_payments`, which is the net cash for the **entire payment batch**, not the per-bill share. This produces incorrect results:
- A $200 bill paid with a $150 credit should show $50 cash paid
- Instead it shows $0.00 because `bill_payments.total_amount` reflects a different grouping

The root cause is on line 380: `totalCashForBill += payment.total_amount` — this is the wrong value to use per-bill.

### Fix in `src/components/bills/BillsApprovalTable.tsx`

**Change the `cashPaid` calculation** (lines 356-384): Instead of using `payment.total_amount`, compute cash paid as:

```
cashPaid = bill.total_amount - sum(credit allocations in same payment)
```

This is straightforward: take the bill's face value and subtract the absolute value of credits applied in the same payment group. For a $200 bill with $150 credit applied, that yields $50 regardless of what `bill_payments.total_amount` stores.

Specifically, replace the loop logic:
- Remove `totalCashForBill += payment.total_amount` 
- After collecting all credits, calculate: `cashPaid = bill.total_amount - credits.reduce((sum, c) => sum + c.amount, 0)`
- This derives the cash amount from the bill's own data rather than the payment batch total

No other files need changes. The tooltip content and display logic remain the same — only the underlying calculation is fixed.

