# Fix Oxford equity accounts and stop parent accounts opening a detail window

## What is wrong
At 103 E Oxford Ave, all 16 equity entries ($375,000) were saved on the parent account **2905 Equity** instead of a child account. **2905.1 OCH** correctly holds $69,000. **2905.2 IM Properties** holds $0.

## 1. Data fix (Oxford only)
- Move all 16 entries on 2905 Equity at Oxford to **2905.2 IM Properties**. That includes the accounting entries plus the matching deposit, check and journal lines.
- Amounts, dates, descriptions and the totals don't change. Afterwards: 2905 = $0 on its own, IM Properties = $375,000, OCH = $69,000, Total Equity stays $442,203.70.
- Check afterwards that nothing is left on 2905 at Oxford and that each entry still balances.

## 2. Parent rows on the Balance Sheet and Income Statement
- When an account has sub-accounts, clicking its name or amount does nothing. Only the arrow still opens and closes it. The details stay in the sub-account windows.
- Accounts without sub-accounts still open their detail window as they do now.

## Technical details
- Update `account_id` from `6ee988a6…` to `898cd0a9…` (2905.2) on `journal_entry_lines`, `deposit_lines` and `check_lines` where project = Oxford.
- `BalanceSheetContent.tsx` (lines 408/412): only attach `onSelect(root)` when `!hasChildren`. Do the same in `IncomeStatementContent.tsx` if it uses the same pattern.
