
# Fix A/P Report: Sum All Payment Debit Lines

## Problem

The Balance Sheet correctly shows $21,086.14 for Accounts Payable on 412 E Nelson (as of 12/31/2025). The A/P Aging report shows $33,991.13 -- nearly double. The per-lot views show ~$16,995 each, which also don't match.

## Root Cause

In `src/components/reports/AccountsPayableContent.tsx`, line 125, the payment calculation reads only the **first** debit line from each payment journal entry:

```
const debit = entry.journal_entry_lines?.[0]?.debit || 0;
```

After the 50/50 lot split, every payment journal entry now has **2 debit lines** (one per lot). The Supabase query with the `!inner` join actually returns **separate rows** for each matching debit line, but the code only reads `[0]` from each. This means only half of each payment is recognized, causing fully-paid bills to appear with open balances.

**Example:** Bill 08112025 ($233.00) is fully paid. Its payment JE has two debit lines of $116.50 each. The code reads one $116.50 entry, so $116.50 appears as an open balance.

## Fix

**One change** in `src/components/reports/AccountsPayableContent.tsx` at lines 123-127.

Replace the current logic that reads only the first debit line:
```
(paymentEntries || []).forEach((entry: any) => {
  const billId = entry.source_id;
  const debit = entry.journal_entry_lines?.[0]?.debit || 0;
  paidAsOfDate[billId] = (paidAsOfDate[billId] || 0) + debit;
});
```

With logic that sums **all** debit lines in each entry:
```
(paymentEntries || []).forEach((entry: any) => {
  const billId = entry.source_id;
  const totalDebit = (entry.journal_entry_lines || []).reduce(
    (sum: number, line: any) => sum + (line.debit || 0), 0
  );
  paidAsOfDate[billId] = (paidAsOfDate[billId] || 0) + totalDebit;
});
```

## Expected Result

After this fix:
- A/P Report **Total** will match the Balance Sheet at **$21,086.14**
- A/P Report per-lot views (Lot 1 and Lot 2) will show correct amounts that sum to the total
- This will fix the issue for **both** 412 E Nelson and 413 E Nelson, and any future project with multi-lot bill splits

## No Database Changes Needed

The data is correct. This is purely a report display bug where payments are being undercounted.
