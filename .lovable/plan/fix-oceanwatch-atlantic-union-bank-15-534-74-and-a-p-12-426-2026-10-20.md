# Fix Oceanwatch Atlantic Union Bank (-$15,534.74) and A/P (-$12,426.00)

## What's wrong (confirmed in the data)
Your reconciliations are right. June ends at $0.00. The books are wrong because six Carter Lumber payments dated 12/15/2025 were posted two extra times on 10/16/2026, at 10:00 PM and again at 10:07 PM:

| Carter invoice | Amount | Extra copies |
|---|---|---|
| 53500053280 | $3,503.60 | 2 (+$7,007.20) |
| 48000481581 | $2,333.15 | 2 |
| 48000480708 | $934.34 | 2 |
| 48000481184 | $845.46 | 2 |
| 48000481252 | $112.08 | 2 |
| 48000479714 | $38.74 | 2 |

The extra copies add up to **exactly $15,534.74**. That's the Atlantic Union Bank number on the balance sheet. Each copy took money out of the bank a second time and paid the bill again, which also pushed A/P negative. None of this came from today's review-screen changes. Those changes didn't touch any balances.

## Fix
1. Delete the 12 extra 10/16 payment entries. Keep the original 12/15/2025 entries.
   - Atlantic Union Bank goes to $0.00, the same as the June statement.
   - A/P goes up by $15,534.74.
   - No reconciliation changes. December still ties to the statement because the originals stay cleared.
2. Check A/P again after step 1. There's a second problem: about 11 vendor credits are marked used, but they were never taken off A/P:
   - Rojas $11,075.23
   - ABC $2,504.76
   - Home Depot $1,698.33
   - 8 Kempsville credits
   
   Bills paid net of those credits show small negative balances. I'll match each credit to its bill. Then I'll show you the list, with what A/P should be, before I change anything.
3. Find what posted the payments again on 10/16 and block it from happening again. A bill can't be paid twice for the same payment.

## Verification
- Balance sheet: 1010 Atlantic Union Bank shows $0.00.
- All 25 reconciliations still show a $0.00 difference.
- A/P matches the open bills in the A/P Aging report once step 2 is approved.

## Technical details
- Duplicate JEs: `bill_payment` journal entries with `source_id` in the six Carter bill IDs, `entry_date` 2025-12-15, `created_at` 2026-10-16 22:00–22:08. Originals were created 2025-12-15. Delete lines and then entries through a one-off data change. Assert the deleted bank credits total 15,534.74 first.
- Credits: `bills` with `total_amount < 0`, `status = 'paid'`, and no `bill_payment` JE. Compare them against `bill_payment_allocations` to build the AP-offset entries.
- Guard: before inserting a `bill_payment` JE, check for an existing non-reversed JE with the same bill, date and amount. Add a test.
