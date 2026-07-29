## What's wrong

Two confirmed bugs make the check reject a line even though an account is clearly selected.

**1. The selected account ID is thrown away immediately (root cause)**

In `src/components/transactions/WriteChecksContent.tsx`, picking an account fires two updates back to back:

```
updateExpenseRow(row.id, "accountId", account.id);
updateExpenseRow(row.id, "account", `${account.code} - ${account.name}`);
```

`updateExpenseRow` (and `updateJobCostRow`) rebuild state from the captured `expenseRows` array instead of using a functional state update. Both calls start from the same stale array, so the second one (the display text) overwrites the first, and `accountId` ends up empty. The row shows "2905.3 - Equity - EG" but validation sees no selection — hence the red border and "select a cost code... or an expense account" toast.

**2. The save-time fallback can't find project-specific accounts**

`findAccountIdFromText` searches `useAccounts()`, which queries only `project_id IS NULL`. Account `2905.3 - Equity - EG` (id `7991a8da-…`) belongs to project `350e5951-…`, so the fallback that normally rescues a missing ID finds nothing and the validation fails for good.

## Fix

In `src/components/transactions/WriteChecksContent.tsx`:

1. Convert `updateExpenseRow` and `updateJobCostRow` to functional updates (`setExpenseRows(prev => prev.map(...))`), and add a small helper that applies multiple fields in one update so account selection sets `accountId` + `account` atomically. Use it in both the Chart of Accounts and Job Cost `onAccountSelect` handlers.
2. Load the project-scoped accounts (same query `AccountSearchInput` uses: `accounts` where `project_id = projectId` and `is_active`) and merge them into the list `findAccountIdFromText` / `resolveBankAccountIdForSave` search, so a typed or pasted project account still resolves at save time.

Apply the identical fix to `src/pages/WriteChecks.tsx`, which contains the same duplicated row-update and resolution logic (same failure mode on that route).

No accounting logic, journal entry math, or validation rules change — the line will simply keep the account the user picked.

## Verify

Reopen Write Checks, select `2905.3 - Equity - EG`, enter the amount, and confirm Save & Close / Save Entry succeed and the check line posts against that account.
