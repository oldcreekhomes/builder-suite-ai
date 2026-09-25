# Fix the $150 JZ Structural credit at 923 17th Street

## Confirmed cause

The March 31 bank reconciliation is correct at **$116,351.07**, but the Balance Sheet calculates **$116,201.07** from the journal entries.

The discrepancy is the March 9 payment combining:
- JZ Structural invoice **260056**: $200.00
- Remaining JZ Structural credit **OCH-02302**: $150.00
- Actual cash paid: **$50.00**

The payment record correctly says $50.00, but its journal entry credits Atlantic Union Bank for the full $200.00. The missing $150 credit was not applied to Accounts Payable in that entry, so the Balance Sheet understates cash by exactly $150.00.

The Green Landscaping $150 payment is a separate, reconciled bank transaction and will not be changed.

## Correction

1. Correct the March 9 journal entry for invoice 260056:
   - Keep the $200.00 Accounts Payable debit.
   - Change the Atlantic Union Bank credit from $200.00 to **$50.00**.
   - Add a **$150.00 Accounts Payable credit** for the applied JZ Structural credit.
2. Preserve the existing payment, credit usage, bills, and completed March reconciliation.
3. Verify as of 03/31/2026:
   - Atlantic Union Bank is **$116,351.07**.
   - Assets still equal Liabilities + Equity to the cent.
   - The March reconciliation remains completed with a $0.00 difference.
   - JZ invoice 260056 and credit OCH-02302 remain fully paid/applied.

## Technical details

- Project: `494d10f1-cbb4-4f64-9ee9-92e755cb088f`
- Consolidated payment: `c5b31abb-b516-42c3-b0a5-75ccb834729d`
- Invoice payment journal entry: `48a09ea4-e219-4569-8119-6ef1d975ad4d`
- Atlantic Union line: `394518a9-4e1c-4790-8a3d-d669f9ca3807`
- This is a targeted data correction; the current payment code already posts net cash and vendor-credit portions separately, so no application code change is needed.
