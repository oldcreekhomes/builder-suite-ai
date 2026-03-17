

## Fix: Running Balance Must Include Prior Transactions

**Problem**: When a date range filter is applied (e.g., 11/01/2025 to 11/30/2025), the running balance starts at $0 instead of carrying forward the balance from all transactions prior to the start date. This causes the ending balance ($1,943.34) to not match the balance sheet ($2,068.11). The difference ($124.77) represents the net of all transactions before 11/01/2025 that are being ignored.

**Root Cause**: In `AccountDetailDialog.tsx`, `calculateRunningBalance` (line 1005) always starts with `let balance = 0`. It only processes `displayedTransactions` (already filtered by date range at line 1020). The full `transactions` dataset is available (the query fetches all transactions regardless of date), but pre-filter transactions aren't used to seed the opening balance.

### Change

**File: `src/components/accounting/AccountDetailDialog.tsx`**

1. **Compute opening balance from excluded transactions** — After filtering `displayedTransactions` (line 1050), calculate the sum of all transactions that fall *before* the `dateFrom` filter. Use the same debit/credit logic based on `accountType`.

2. **Seed the running balance** — Pass the computed opening balance into `calculateRunningBalance` so `let balance = openingBalance` instead of `let balance = 0`.

```text
// Pseudocode for the fix:

// 1. Calculate opening balance from transactions before dateFrom
let openingBalance = 0;
if (dateFrom && transactions) {
  const fromDate = new Date(dateFrom);
  fromDate.setHours(0, 0, 0, 0);
  transactions.forEach(txn => {
    const txnDate = new Date(txn.date);
    txnDate.setHours(0, 0, 0, 0);
    if (txnDate < fromDate) {
      if (accountType === 'asset' || accountType === 'expense') {
        openingBalance += txn.debit - txn.credit;
      } else {
        openingBalance += txn.credit - txn.debit;
      }
    }
  });
}

// 2. Update calculateRunningBalance to accept starting balance
const calculateRunningBalance = (transactions, startingBalance = 0) => {
  let balance = startingBalance;
  return transactions.map(txn => {
    // ... same logic ...
    return balance;
  });
};

// 3. Pass opening balance
const balances = calculateRunningBalance(displayedTransactions, openingBalance);
```

This ensures the last row's balance column matches the balance sheet figure exactly, regardless of date filtering.

