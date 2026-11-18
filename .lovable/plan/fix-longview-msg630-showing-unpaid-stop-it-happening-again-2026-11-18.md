# Fix Longview MSG630 showing unpaid + stop it happening again

## What happened
Green Landscaping bill MSG630 ($325, 126 Longview) was paid twice:
- 08/26/2026 from account 1010 (the mistake)
- 08/27/2026 from 1015 Capital One. This is the real payment, and it is reconciled in August.

On 11/17/2026 someone reversed the 08/26 duplicate. That was the right thing to do. But the reversal took $325 off the bill's "paid" amount, which was only $325 to begin with, so the bill dropped to $0 paid and moved back to Approved. The 08/27 payment is still live and reconciled, so the books are correct. Only the bill's status is wrong.

## Fix
1. **Data (Longview only):** set MSG630 back to Paid with $325 paid. The journal entries and the reconciliation stay exactly as they are.
2. **Code (reversal logic):** when a payment is reversed, recalculate the bill's paid amount from the payments that are still active instead of subtracting. Then reversing a duplicate payment can never make a paid bill look unpaid again. This applies to both the single-payment and the combined-payment reversal.
3. **Heads-up, no change:** 06082026-Custis ($4,604.17) has two live payments totaling $9,208.34. It looks paid twice. I'll show you the details, but I won't touch it without your OK.

## Technical
- Migration: in `reverse_bill_payment` and `reverse_consolidated_bill_payment`, replace `amount_paid - payment_amount` with a recompute: the sum of A/P (2010) debits on non-reversed, non-reversal `bill_payment` JEs for that bill. Set status to `paid` when that sum is at least total_amount, otherwise `posted`.
- Data: `update bills set amount_paid=325, status='paid' where id='4f78c88c-…'`.
