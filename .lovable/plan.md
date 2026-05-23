The Balance Sheet is forcing itself to balance by posting the entire unresolved difference into Equity. That is why you’re seeing negative equity. The root problem is the recent consolidated bill-payment adjustment only fixed the bank-account side, but it did not apply the matching Accounts Payable side.

Plan:

1. Update the Balance Sheet calculation
   - Keep Atlantic Union Bank matching the account detail dialog at $101,788.21.
   - When consolidated bill payments are substituted in, also apply the matching debit/reduction to Accounts Payable.
   - Do not dump the remaining imbalance into Equity.

2. Update the sent/PDF Balance Sheet calculation the same way
   - Make the emailed/exported Balance Sheet use the same logic as the on-screen report.

3. Add a small shared helper or local utility pattern so the consolidated-payment adjustment stays symmetric
   - Suppress old per-bill payment lines.
   - Add one consolidated credit to the bank account.
   - Add one consolidated debit/reduction to A/P.

4. Validate against Oceanwatch Court as of January 31, 2026
   - Atlantic Union Bank remains $101,788.21.
   - Accounts Payable becomes $23,956.75 instead of $124,913.46.
   - Total Equity no longer shows the artificial negative $98,956.71 / DIFF line.
   - Total Assets equals Total Liabilities & Equity without an artificial Equity plug.