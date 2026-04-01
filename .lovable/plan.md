

## Fix: Account Column Not Showing for Bill Payments in Reconciliation

### Problem
The Account column shows "-" for most bill payments. The allocation data is being fetched from `bill_lines`, but the `AllocationCell` at line 1311-1314 uses a check-specific fallback pattern:
```tsx
allocations={check.accountAllocations?.length ? check.accountAllocations : check.allocations}
```
This works for checks but bill payments may have neither populated if the fetch isn't matching correctly. The likely issue is that `bill_lines` may have lines where **neither** `cost_code_id` nor `account_id` is set, or the bill payment's `sourceBillId` isn't being preserved on the final transaction object after mapping.

### Root Cause Investigation Needed
In the legacy bill payment mapping (line 371-406), the code maps over `billPaymentTransactions` and looks up lines by `(bp as any).sourceBillId`. Two potential issues:
1. The `sourceBillId` property may not survive if earlier code strips unknown properties
2. Some `bill_lines` may use a direct GL account on the `bills` table (`account_id`) rather than line-level allocations — these wouldn't be captured by querying `bill_lines`

### Fix
**File: `src/hooks/useBankReconciliation.ts`**

1. After building bill payment allocations from `bill_lines`, add a **fallback** for bill payments that still have no allocations: query the `bills` table's own `account_id` field (if it exists) or the journal entry lines' account to get the GL account
2. For any bill payment transaction where both `allocations` and `accountAllocations` are empty after the `bill_lines` lookup, fetch the account from the corresponding `journal_entry_lines` debit side (the expense account), which always exists since every bill payment creates a JE with a debit to an expense/cost account and credit to the bank

**Concrete approach — use journal entry lines as fallback:**
- The JE for a bill payment has lines: debit to expense account, credit to bank account
- We already have the JE line IDs (they're used as transaction IDs)
- Fetch the **debit** lines from the same journal entries to get the expense accounts
- Map those accounts as `accountAllocations` for any bill payment that still shows "-"

### Files Changed
- `src/hooks/useBankReconciliation.ts` — add JE-line-based account fallback for bill payments with empty allocations

