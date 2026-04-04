

## Fix: Sort A/P Aging Report by Aging Days (Chronological)

### Problem
Within each aging bucket, bills are sorted by bill date (ascending). The user wants them sorted by aging days in chronological order — lowest aging at top, highest at bottom. This affects both the on-screen report and the emailed PDF.

### Fix
Change the sort in both locations from `billDate` comparison to `aging` ascending:

**1. `src/components/reports/AccountsPayableContent.tsx` (~line 256-258)**
Replace `a.billDate.localeCompare(b.billDate)` with `a.aging - b.aging` to sort by aging days ascending.

**2. `src/components/accounting/SendReportsDialog.tsx` (~after line 788)**
Add the same sort step after populating the buckets — sort each bucket by `aging` ascending, matching the UI.

### Result
Both the on-screen A/P Aging table and emailed PDF will display bills within each bucket ordered from lowest aging (newest bills) at top to highest aging (oldest bills) at bottom.

### Files changed
- `src/components/reports/AccountsPayableContent.tsx`
- `src/components/accounting/SendReportsDialog.tsx`

