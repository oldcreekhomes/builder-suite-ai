# Fix the duplicate $60,000 equity deposit at Nob Hill

Data-only change. No code edits.

## What's actually there

Two identical $60,000 deposits exist on 05/20/2026 to 1015 - Capital One, "Old Creek Homes, LLC", both crediting 2905.1 Equity Partner #1:

| Deposit | Lines | Check # | Reconciled |
|---|---|---|---|
| Created 05/28 (correct one) | 1 line, no lot | none | No |
| Created 08/20 (duplicate) | 19 lines, one per lot | 05202026 | Yes, in the 05/31/2026 reconciliation |

The 05/31/2026 Capital One reconciliation at Nob Hill has 3 checked items (ending balance 59,901.55, difference 0.00) and the checked one is the 19-lot duplicate.

## The fix

1. Swap the reconciliation: mark the 1-line deposit as reconciled/cleared against the 05/31/2026 reconciliation and replace the duplicate's id with it in the reconciliation's checked transaction list. Both are $60,000, so the reconciled balance stays 59,901.55 and the difference stays 0.00.
2. Delete the 19-lot duplicate deposit and its journal entry (20 lines) using the existing delete-deposit-with-journal-entries routine, so job costs and the balance sheet drop the duplicated equity and lot allocations.

## Result

One $60,000 equity deposit remains at Nob Hill, shown as reconciled in the May statement; the May reconciliation still balances to $0.00 difference, and 2905.1 no longer double-counts the $60,000.
