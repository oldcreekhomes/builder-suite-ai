I found the mismatch: the Balance Sheet is summing raw `journal_entry_lines`, while the bank account detail dialog has extra logic for consolidated bill payments. For Oceanwatch / Atlantic Union Bank as of 01/31/2026, that difference reproduces exactly:

```text
Balance Sheet:          $108,795.41
Account Detail dialog:  $101,788.21
Difference:               $7,007.20
```

## Plan

1. Create one shared balance calculation for report account balances
   - Keep the same as-of date filter.
   - Keep the same project-scoped filtering.
   - Keep the same canonical reversal filters.
   - For bank/cash accounts, match the Account Detail dialog behavior:
     - exclude individual bill-payment ledger lines that belong to consolidated payments
     - include the consolidated `bill_payments.total_amount` once
     - ignore reversed/deleted source records the same way the dialog does

2. Update the Balance Sheet UI to use that shared calculation
   - The `1010 - Atlantic Union Bank` row will show the same ending balance as the dialog.
   - Other account types keep the same debit/credit sign conventions already used by the Balance Sheet.

3. Update generated/sent Balance Sheet report logic if it has the same duplicated calculation
   - This prevents the on-screen Balance Sheet and exported/sent report from disagreeing.

4. Verify against Oceanwatch Court
   - Confirm Atlantic Union Bank shows `$101,788.21` as of January 31, 2026.
   - Confirm clicking the bank account still opens the same dialog and both totals match.