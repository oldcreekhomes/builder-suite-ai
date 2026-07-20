## Confirmed cause

The January 31 Balance Sheet shows **$108,795.41**, while the completed bank reconciliation and statement both show **$101,788.21**—an exact **$7,007.20** difference.

That difference is Carter Lumber payment **Ref. 53500053280**:
- The $7,007.20 bank-credit journal entry is dated **December 15, 2025**.
- It was included in the reconciled bank activity.
- On **January 21, 2026**, the journal entry was marked `reversed_at`, but no reversing journal entry was created and `reversed_by_id` is empty.
- The Balance Sheet therefore removes the payment as of January 31, increasing cash by exactly $7,007.20, even though the bank reconciliation correctly retains the cleared payment.

## Implementation

1. **Repair this journal entry**
   - Remove the orphaned `reversed_at` marker from the $7,007.20 payment journal entry.
   - Do not alter the completed reconciliation, statement balance, or any unrelated transactions.
   - Confirm the January 31 Atlantic Union Bank Balance Sheet becomes **$101,788.21**.

2. **Prevent orphan reversals**
   - Update the bill correction/reversal flow so a payment journal entry cannot be marked reversed unless a linked reversing journal entry is created.
   - Keep the canonical historical report filter unchanged; it is exposing malformed ledger data rather than causing the discrepancy.

3. **Validate accounting integrity**
   - Recalculate the account through November, December, and January.
   - Verify December remains **$55,487.17**, January becomes **$101,788.21**, and the Balance Sheet remains balanced.
   - Verify the Account Detail and reconciliation review show the same payment exactly once.