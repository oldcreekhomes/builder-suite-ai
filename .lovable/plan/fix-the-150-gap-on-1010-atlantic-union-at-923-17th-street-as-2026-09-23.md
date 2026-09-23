# Fix the $150 gap on 1010 Atlantic Union at 923 17th Street (as of 03/31/2026)

## What the data shows
- Bank statement ending 03/31/2026: $116,351.07. The March reconciliation in BuilderSuite was completed at this same number.
- Balance Sheet 1010: $116,201.07, which is $150.00 lower.
- March deposits match the bank exactly ($122,379.00 Anchor Loans + $48.17 Floor & Decor = $122,427.17).
- So the gap is on the money-out side. The one March item left **uncleared** in the March reconciliation is:
  - **Green Landscaping, Inc. – bill MSG527, $150.00 (snow removal), payment dated 03/13/2026 from 1010.**
- The books count that $150 as paid out of Atlantic Union. The bank never shows it, and that is exactly the $150 difference.

## Proposed fix (data only, this project only)
1. Look for any Green Landscaping credit that was meant to cover MSG527 and wasn't applied.
2. Fix the MSG527 payment so it no longer takes $150 out of 1010:
   - **If a Green Landscaping credit covered it:** apply that credit to MSG527 and remove the $150 cash payment.
   - **If there's no credit:** remove the 03/13 payment so MSG527 goes back to Open ($150 owed), then pay it on the date it really cleared the bank.
3. Check the result: 1010 on the Balance Sheet as of 03/31/2026 reads $116,351.07, Assets still equal Liabilities + Equity, and the April–August reconciliations are unchanged.

No code changes.

## Technical details
- Bill `d75d5bb4-6e9d-44c9-adc4-288cb988ba62`, bill payment `72f0686a-acdc-4b61-b2fe-acfd7f5722d9` (reconciled = false), payment JE `cc8ac346-7379-4253-8895-7d70ecd8be62` (credit to 1010 $150.00).
- March recon `e102b4c4-dc96-48b4-8bc2-ef1a41b08917`.
- Remove the payment with the existing reverse/delete payment path (JE reversal pair, allocation removed, bill status recomputed). Don't hand-edit JE amounts.
