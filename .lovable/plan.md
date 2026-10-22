# Make the A/P section totals clearly labeled

## What's going on (confirmed)
Nothing is missing. The $80,354.14 at the top right is the total for the **1 - 30 Days** section only: its 27 bills add up to exactly that. The 31 - 60 Days section adds $320.28, and $80,354.14 + $320.28 = $80,674.42. That's the Total Outstanding, and it matches 2010 Accounts Payable on the Balance Sheet.

The confusing part is that the section total sits at the top right with no label, so it looks like the report's grand total.

## Change
1. Label each section total, for example "1 - 30 Days total: $80,354.14".
2. Show the Total Outstanding ($80,674.42) at the top of the report as well as at the bottom, so the first number you see is the full A/P total.
3. Make the same change to the exported A/P PDF so the screen and the PDF look the same.

No amounts, bills or accounting change.

## Technical details
- `src/components/reports/AccountsPayableContent.tsx` ~line 619: prefix the bucket total with a muted "Section total" label. Add a summary row above the buckets showing the grand total that's already computed for the footer.
- `src/components/reports/pdf/AccountsPayablePdfDocument.tsx`: the same label and top summary.
