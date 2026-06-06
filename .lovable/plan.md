## Problem

In `TransactionDetailDialog`, Balance for a Bill Pmt row is computed as `total_amount − amount_paid` on the underlying bill(s). `amount_paid` is the cumulative total of every payment, so once the bill is fully paid, every individual payment shows Balance = $0 and there's no indication of prior payments.

City Concrete example (bill $15,028, two payments $10,000 + $5,028):
- Payment 1 (3/9, $10,000) shows Balance $0 (wrong, should be $5,028).
- Payment 2 (3/9, $5,028) shows Balance $0 with no context (should show "Previous Payments: ($10,000)" and Balance $0).

## Fix

Single file: `src/components/accounting/TransactionDetailDialog.tsx`.

### 1. Load every allocation with its payment date
Inside the `bill_payment` / `consolidated_bill_payment` branch of the existing `fetchAttachments` effect (the place that already loads `bills`/`bill_lines` for the bill IDs):

- Query `bill_payment_allocations` joined with `bill_payments(payment_date)` for all collected `billIds`. Select `bill_id, amount_allocated, bill_payment_id, bill_payments(payment_date)`.
- Also keep track of which `bill_payment_id`s belong to the CURRENT transaction. For `consolidated_bill_payment` rows `transaction.source_id` is the `bill_payment.id`. For single `bill_payment` rows we don't have the payment id directly, so identify "current" allocations by `payment_date === transaction.date` AND `bill_payment_id ∈ paymentIds` if known; otherwise just by date.

### 2. Compute previous + balance
Cent-precise math (already the project standard):
- `originalBillTotal` = Σ bill.total_amount (unchanged).
- `previousPaymentsTotal` = Σ allocation.amount_allocated where `payment_date < transaction.date`.
- `currentPaymentTotal` = `abs(transaction.debit − transaction.credit)` (already used as Current Payment).
- `remainingBillBalance` = `originalBillTotal − previousPaymentsTotal − currentPaymentTotal`.

Store `previousPaymentsTotal` in new state `previousPaymentsTotal: number | null`.

### 3. Render
In the bill-like `details` array (around line 387), insert a new row between "Original Bill" and "Current Payment" — only when `previousPaymentsTotal > 0`:

```text
{ label: 'Previous Payments', value: '(formatCurrency(prev))', valueClassName: 'text-destructive' }
```

`Balance` row stays in the same position but uses the new corrected `remainingBillBalance`.

Reset `previousPaymentsTotal` to `null` in the existing dialog-close cleanup block alongside the other state resets.

## Out of scope
- No DB changes.
- No changes to the AccountDetailDialog row Balance column (that's the running bank balance and is correct).
- No changes for non-bill transactions (Check / Deposit / CC / JE).
- No changes to PO rows, attachments, or lock logic.
