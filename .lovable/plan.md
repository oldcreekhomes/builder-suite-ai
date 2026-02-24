

## Fix: A/P Aging Email Report Not Filtering by As-Of Date

### Problem
The "Send Reports" dialog generates the A/P Aging PDF using a query that fetches **all open bills regardless of date**. This is why the emailed report shows $120,669.35 (including bills from Oct 2025 through Feb 2026) instead of the correct $12,391.77 (only bills on or before Sep 30, 2025).

The on-screen Accounts Payable tab works correctly because it applies `.lte('bill_date', asOfDateStr)` and uses the predecessor chain logic for accurate payment attribution. The email report skips both of these.

### Root Cause (SendReportsDialog.tsx, lines 644-658)
The bill query is missing the date filter:
```
.eq('project_id', projectId)
.in('status', ['posted', 'paid'])
.eq('is_reversal', false)
.is('reversed_by_id', null)
// MISSING: .lte('bill_date', asOfDateStr)
```

It also lacks:
- The predecessor chain logic (mapping payments from reversed bills to their active successors)
- As-of-date-aware payment calculation (payments made after the as-of date should not reduce the open balance)
- Lot filtering (the on-screen report filters by lot, but the email version does not)

### Solution
Port the exact query and calculation logic from `AccountsPayableContent.tsx` into `SendReportsDialog.tsx` so the emailed PDF matches the on-screen report exactly.

### Changes to `src/components/accounting/SendReportsDialog.tsx`

**1. Add date filter to the bills query (line 658)**
Add `.lte('bill_date', asOfDateStr)` to only include bills dated on or before the as-of date.

**2. Add predecessor chain logic for payment attribution**
Port the predecessor map logic from `AccountsPayableContent.tsx` (lines 110-175) that:
- Fetches reversed bills and maps them by reference number to active successors
- Queries journal entries (bill payments) to calculate actual payments made on or before the as-of date
- Sums ALL debit lines in payment journal entries (to account for multi-lot splits)
- Attributes payments from predecessor (reversed) bill IDs to their active successors

**3. Calculate open balance using as-of-date-aware payments**
Instead of using `bill.total_amount - bill.amount_paid` (which reflects current payment state, not as-of-date state), calculate open balance as `bill.total_amount - paymentsAsOfDate` using the journal-entry-derived payment totals.

**4. Filter out fully-paid-as-of-date bills**
After recalculating open balances, exclude bills where the as-of-date open balance is less than or equal to $0.01.

### File Modified
| File | Change |
|------|--------|
| `src/components/accounting/SendReportsDialog.tsx` | Replace the AP aging generation block (lines ~644-712) with the full date-aware, predecessor-chain-aware logic from AccountsPayableContent.tsx |

### Expected Result
- Emailed A/P Aging PDF for "923 17th St" as of Sep 30, 2025 will show $12,391.77 -- matching the Balance Sheet and the on-screen Accounts Payable tab exactly.
- Bills dated after the as-of date (Oct 2025 onward) will be excluded.
- Payments made after the as-of date will not reduce open balances.

