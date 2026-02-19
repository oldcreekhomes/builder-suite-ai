

## Problem Summary

Raymond's bill approval is failing because of a **$0.00 bill line**. The City of Alexandria bill has 5 lines, one of which is a `job_cost` line with amount = $0.00. When approving, the system tries to create a journal entry line with both debit and credit = 0, which violates a database constraint that requires every journal entry line to have a positive debit OR positive credit.

This also created **6 orphaned journal entries** (from 6 retry attempts) that need cleanup.

## Fix Plan

### 1. Clean up orphaned journal entries (database)
Delete the 6 orphaned journal entries that have no lines:
- Journal entry IDs: `2e5a54c6`, `b8a03c88`, `e814e497`, `396f1a36`, `4235650d`, `88642265`

### 2. Fix the $0 bill line (database)
Delete the zero-amount job_cost bill line (`id: 5378d3ca`) that has no useful data (amount=0, memo=null, lot_id=null).

### 3. Code fix: Skip zero-amount lines in postBill (src/hooks/useBills.ts)
In the `postBill` mutation, add a guard to skip bill lines with amount = 0 when creating journal entry lines. This prevents the CHECK constraint violation.

```typescript
// In postBill mutationFn, before processing each bill line:
for (const line of bill.bill_lines) {
  // Skip zero-amount lines - they can't create valid journal entries
  if (line.amount === 0 || line.amount === null) continue;
  
  // ... existing processing logic
}
```

### 4. Code fix: Skip zero-amount lines in AI extraction approval (src/hooks/usePendingBills.ts)
Same guard in the `approve_pending_bill` RPC call path - though the RPC itself should handle this, the batch approval logic should also filter zero-amount lines.

After these changes, Raymond can approve the bill successfully, and future bills with zero-amount lines won't cause this error.
