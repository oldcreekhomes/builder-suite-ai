
## Fix: Balance Sheet Not Balancing -- `Math.abs()` Bug in Equity (and Liability) Calculations

### Root Cause

The bug is in how equity account balances are calculated. The code uses `Math.abs(rawBalance)` for equity accounts, but it should use `-rawBalance` (the same formula used for liabilities).

**Why `Math.abs()` is wrong:**
- In double-entry accounting, `rawBalance = sum(debits) - sum(credits)`.
- Equity accounts normally have **credit** balances, so `rawBalance` is typically negative.
- `Math.abs()` and `-rawBalance` both produce the correct positive display value for normal credit balances.
- **But** if an equity account has a **debit** balance (e.g., owner draws, or a loss), `rawBalance` is positive. `Math.abs()` keeps it positive, but `-rawBalance` correctly makes it negative -- which **subtracts** from total equity.
- Using `Math.abs()` means a debit-balance equity account gets **added** to equity instead of subtracted, throwing off the balance sheet by exactly 2x that account's balance.

This is almost certainly the source of the $1,404.08 difference -- an equity account with ~$702.04 debit balance is being added instead of subtracted.

### Fix

Change `Math.abs(rawBalance)` to `-rawBalance` for equity accounts in all three files:

| File | Line | Change |
|------|------|--------|
| `src/components/reports/BalanceSheetContent.tsx` | 177 | `Math.abs(rawBalance)` to `-rawBalance` |
| `src/pages/BalanceSheet.tsx` | 137 | `Math.abs(rawBalance)` to `-rawBalance` |
| `src/components/accounting/SendReportsDialog.tsx` | 210 | `Math.abs(rawBalance)` to `-rawBalance` |
| `src/components/accounting/SendReportsDialog.tsx` | 201 | `Math.abs(rawBalance)` to `-rawBalance` (liabilities too -- same bug) |

This makes equity match the identical pattern already used for liabilities (`-rawBalance`) in the two main Balance Sheet files, which is the correct accounting formula.

### Why This Permanently Prevents Future Imbalances

The Balance Sheet equation is: **Assets = Liabilities + Equity**

In raw journal entry terms (debit - credit):
- Assets: `rawBalance` (debit-normal, positive is correct)
- Liabilities: `-rawBalance` (credit-normal, negate to display as positive)
- Equity: `-rawBalance` (credit-normal, negate to display as positive)

When all three use the correct sign convention, the equation is mathematically guaranteed to balance because every journal entry has equal debits and credits. The only way it can be off is if `Math.abs()` or similar logic breaks the sign, which is exactly what is happening now.

### Files Changed
| File | Change |
|------|--------|
| `src/components/reports/BalanceSheetContent.tsx` | Fix equity: `Math.abs(rawBalance)` to `-rawBalance` |
| `src/pages/BalanceSheet.tsx` | Fix equity: `Math.abs(rawBalance)` to `-rawBalance` |
| `src/components/accounting/SendReportsDialog.tsx` | Fix equity AND liabilities: `Math.abs(rawBalance)` to `-rawBalance` |
