
# Fix: Three-Way Accounting Reconciliation (Balance Sheet, Account Detail, A/P Aging)

## Problem Summary

Three views that should show the same Accounts Payable balance are showing three different numbers:

- **Balance Sheet**: $26,053.95
- **Account Detail Dialog**: $25,891.39
- **A/P Aging Report**: $0.00

## Root Causes Found

### Bug 1: Balance Sheet is too HIGH ($26,053.95 instead of $25,891.39)

The Balance Sheet query is missing a `reversed_by_id IS NULL` filter. When a bill is corrected (edited after posting), the original bill's journal entry gets `reversed_by_id` set to the new corrected entry. The Balance Sheet fails to exclude these corrected originals, double-counting 11 bill entries totaling $162.56 net excess.

**Fix**: Add `.is('journal_entries.reversed_by_id', null)` to the Balance Sheet journal lines query in `BalanceSheetContent.tsx`.

### Bug 2: Account Detail Dialog uses wrong reversal filtering

The Account Detail query uses strict `reversed_at IS NULL` instead of the as-of-date-aware pattern `(reversed_at IS NULL OR reversed_at > asOfDate)`. This means bill payments that were reversed AFTER the as-of date (e.g., reversed on Jan 21, 2026) are excluded from a Dec 31, 2025 report, even though they were valid on that date. In this case, 7 payment entries ($2,057.96) are incorrectly excluded. This error is partially masked because it partially offsets Bug 1's overcounting.

**Fix**: When `asOfDate` is provided, replace `.is('journal_entries.reversed_at', null)` with `.or('reversed_at.is.null,reversed_at.gt.{asOfDate}', { referencedTable: 'journal_entries' })` in `AccountDetailDialog.tsx`.

### Bug 3: A/P Aging Report shows $0 due to lot filtering

When "Lot 1" is selected, the A/P Aging query only includes bills whose `bill_lines` have `lot_id` matching the selected lot. However, the vast majority of bill lines on this project have `lot_id = NULL` (legacy/unallocated). This filters out nearly every bill, resulting in $0.

The Job Costs report already handles this correctly by including journal entries where `lot_id` matches the selected lot OR is NULL. The A/P Aging report needs to follow the same pattern.

**Fix**: In `AccountsPayableContent.tsx`, when filtering by lot, include bill lines where `lot_id = selectedLotId` OR `lot_id IS NULL`.

## Canonical Filter Pattern

All three views must use the same journal entry filtering:

```text
is_reversal = false
AND reversed_by_id IS NULL
AND (reversed_at IS NULL OR reversed_at > asOfDate)
```

## Files to Edit

| File | Change |
|---|---|
| `src/components/reports/BalanceSheetContent.tsx` | Add `.is('journal_entries.reversed_by_id', null)` to journal lines query |
| `src/components/accounting/AccountDetailDialog.tsx` | Use as-of-date-aware reversal filtering when asOfDate is provided |
| `src/components/reports/AccountsPayableContent.tsx` | Include NULL lot_id bill lines when a specific lot is selected |

## Technical Details

### BalanceSheetContent.tsx (line ~78)
Add after the `.or(...)` reversal filter:
```typescript
.is('reversed_by_id', { referencedTable: 'journal_entries' }, null)
```

### AccountDetailDialog.tsx (lines 140-141)
Replace:
```typescript
.is('journal_entries.reversed_at', null)
.is('journal_entries.reversed_by_id', null);
```
With conditional logic:
```typescript
.is('journal_entries.reversed_by_id', null);
// Then conditionally:
if (asOfDate) {
  query = query.or(
    `reversed_at.is.null,reversed_at.gt.${asOfDate.toISOString().split('T')[0]}`,
    { referencedTable: 'journal_entries' }
  );
} else {
  query = query.is('journal_entries.reversed_at', null);
}
```

### AccountsPayableContent.tsx (lines 139-157)
Change the lot filtering from strict match to inclusive match:
```typescript
if (isLotView) {
  filteredBills = filteredBills.filter(bill => {
    const lotLines = bill.bill_lines?.filter(
      line => line.lot_id === selectedLotId || line.lot_id === null
    ) || [];
    return lotLines.length > 0;
  });

  filteredBills = filteredBills.map(bill => {
    const lotAmount = bill.bill_lines
      .filter(line => line.lot_id === selectedLotId || line.lot_id === null)
      .reduce((sum, line) => sum + line.amount, 0);
    const ratio = bill.total_amount > 0 ? lotAmount / bill.total_amount : 0;
    return {
      ...bill,
      total_amount: lotAmount,
      amount_paid: bill.amount_paid * ratio,
    };
  });
}
```
