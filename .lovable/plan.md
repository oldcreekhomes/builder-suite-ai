## Problem

Saving an expense line in the Edit Bill dialog fails with:

```
invalid input syntax for type uuid: "5160 - Phone"
```

## Root Cause

In `src/components/bills/EditBillDialog.tsx` the Expense tab's `AccountSearchInput` is wired incorrectly:

```tsx
<AccountSearchInput
  value={row.accountId || ""}
  onChange={(accountId) => updateExpenseRow(row.id, 'accountId', accountId)}
  ...
/>
```

`AccountSearchInput.onChange` emits the display string (e.g. `"5160 - Phone"`), not the UUID. Only the `onAccountSelect` callback provides the account id. So `row.accountId` gets overwritten with the display string, and the update mutation sends `"5160 - Phone"` to a uuid column → 22P02.

`ManualBillEntry.tsx` wires the same component correctly (value = display, onChange updates `account`, onAccountSelect updates both `accountId` and `account`).

## Fix

Only change the Expense-row `AccountSearchInput` in `EditBillDialog.tsx` (around line 1250) to match the working pattern:

```tsx
<AccountSearchInput
  value={row.account || ""}
  onChange={(value) => updateExpenseRow(row.id, 'account', value)}
  onAccountSelect={(account) => {
    updateExpenseRow(row.id, 'accountId', account.id);
    updateExpenseRow(row.id, 'account', `${account.code} - ${account.name}`);
  }}
  placeholder="Select account"
  accountType="expense"
  projectId={row.projectId || undefined}
  className="h-10"
  disabled={isApprovedBill}
/>
```

No other files, no logic changes, no styling changes beyond this input's wiring.
