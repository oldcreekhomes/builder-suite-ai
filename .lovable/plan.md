
# Fix: Deposit Account Selection Not Persisting

## Problem

When editing a deposit and changing the Account column (e.g., from "2530 - Land Loan" to "2540 - Anchor Loan Refinance"), the change shows "Success" but does NOT actually save to the database. Upon returning to the deposit, the old account is displayed.

## Root Cause

**Stale closure bug in state update functions.**

When a user selects an account from the dropdown, TWO state updates are triggered in rapid succession:
1. `updateOtherRow(id, "account", "2540 - Anchor Loan...")` - updates display text
2. `updateOtherRow(id, "accountId", "00d06552...")` - updates the actual account ID

The `updateOtherRow` function currently uses the closure variable `otherRows` directly:

```typescript
const updateOtherRow = (id: string, field: keyof DepositRow, value: string) => {
  setOtherRows(otherRows.map(row =>  // <-- BUG: stale closure
    row.id === id ? { ...row, [field]: value } : row
  ));
};
```

When both calls happen in the same event cycle, they both reference the SAME stale `otherRows`. React batches these updates, and the second call **overwrites** the first rather than building upon it.

**Result**: The `accountId` gets lost, so when the deposit is saved, it uses the OLD account ID from the original row data.

---

## Solution

Change `updateOtherRow` and `updateRevenueRow` to use React's **functional update pattern**, which ensures each update builds on the previous state:

```typescript
const updateOtherRow = (id: string, field: keyof DepositRow, value: string) => {
  setOtherRows(prev => prev.map(row => 
    row.id === id ? { ...row, [field]: value } : row
  ));
};

const updateRevenueRow = (id: string, field: keyof DepositRow, value: string) => {
  setRevenueRows(prev => prev.map(row => 
    row.id === id ? { ...row, [field]: value } : row
  ));
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/transactions/MakeDepositsContent.tsx` | Fix `updateOtherRow` and `updateRevenueRow` functions |

---

## Technical Details

### Before (Buggy)
```typescript
const updateOtherRow = (id: string, field: keyof DepositRow, value: string) => {
  setOtherRows(otherRows.map(row => 
    row.id === id ? { ...row, [field]: value } : row
  ));
};

const updateRevenueRow = (id: string, field: keyof DepositRow, value: string) => {
  setRevenueRows(revenueRows.map(row => 
    row.id === id ? { ...row, [field]: value } : row
  ));
};
```

### After (Fixed)
```typescript
const updateOtherRow = (id: string, field: keyof DepositRow, value: string) => {
  setOtherRows(prev => prev.map(row => 
    row.id === id ? { ...row, [field]: value } : row
  ));
};

const updateRevenueRow = (id: string, field: keyof DepositRow, value: string) => {
  setRevenueRows(prev => prev.map(row => 
    row.id === id ? { ...row, [field]: value } : row
  ));
};
```

---

## Why This Works

| Before | After |
|--------|-------|
| Both state updates use the same stale `otherRows` reference | Each update receives the latest state via `prev` parameter |
| Second update overwrites first update | Updates are properly chained - second builds on first |
| `accountId` gets lost during rapid updates | Both `account` and `accountId` are preserved |
| Database saves old account | Database saves correct new account |

---

## Verification

After the fix:
1. Navigate to Make Deposits
2. Open an existing deposit  
3. Change the Account column to a different account
4. Click "Save Entry"
5. Navigate away and return to the deposit
6. The new account should persist correctly
