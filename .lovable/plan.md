# Fix Oxford AUB: ELG $120 check counted 3 times

## What's wrong (confirmed in your data)
There is only **one** ELG Consulting check dated 10/24/2024 for $120.00, which matches Jole's check record and the bank statement. But its lines were saved three times:
- The check has 6 lines of $60 (Lot A, Lot B, three times) instead of 2.
- Its accounting entry takes $120 out of 1010 Atlantic Union Bank **three times** ($360 total), and puts $360 into 1430 WIP.

That's why the register shows three $120 rows and the Balance Sheet shows 1010 at -$240.00 instead of $0.00.

## Fix (one-time data change, no code change)
1. Keep the first $60 + $60 pair of check lines; delete the other 4 lines.
2. On the accounting entry, keep one $120 credit to 1010 and one $60 + $60 debit to 1430; delete the 2 extra 1010 lines and 4 extra 1430 lines.
3. Read back: check lines total $120, entry balances, 1010 at Oxford = $0.00.

**Reports impact:** 1010 Atlantic Union Bank goes up $240 (to $0.00); 1430 WIP goes down $240 ($120 per lot). The Balance Sheet still balances. The check stays cleared; no reconciliation changes.

## Rimble Landscaping $114 (10/24/2024)
Jole says it should show Cleared. I'll check whether the October 2024 AUB reconciliation includes it and mark the payment's bank entry cleared there if the statement shows it, without changing the reconciliation's ending balance.

## Not included
Other jobs have older checks with mismatched lines (e.g. Robert K. Harwood 07/14/2024 settlement checks, two $0.01 differences). I'll leave those alone unless you want them looked at next.
