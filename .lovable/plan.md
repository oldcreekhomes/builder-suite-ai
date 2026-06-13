## Fix: Remove duplicate bill 48345SG004483 on Ocean Watch Court

The user confirmed bill `48345SG004483` ($305.28) is a duplicate of `48345SG004521-Revised`. The XYZ Credit Card "payment" was a workaround to clear it from A/P. We'll undo both.

### Steps

1. **Reverse the XYZ Credit Card bill payment** `a29de768…` ($305.27)
   - Delete the `bill_payment_allocations` row linking payment → bill `48345SG004483`
   - Delete the `journal_entry_lines` and `journal_entries` row created by this payment (debit A/P / credit 2150 XYZ Credit Card)
   - Delete the `bill_payments` row
   - Result: XYZ Credit Card balance returns to $0; bill `48345SG004483` returns to status `open` with $305.28 due

2. **Hard-delete the duplicate bill** `48345SG004483`
   - Delete `bill_lines` for the bill
   - Delete the bill's posting `journal_entry_lines` and `journal_entries` (debit WIP/4580 / credit A/P)
   - Delete any `bill_attachments` rows
   - Delete the `bills` row
   - Per project memory (Hard Delete pattern), this releases the vendor invoice reference and removes the duplicate cleanly

### Expected impact on Ocean Watch Court Balance Sheet

- **2150 XYZ Credit Card:** $305.27 → $0 (line disappears)
- **A/P:** unchanged (the duplicate's $305.28 credit to A/P is removed at the same time as the offsetting payment's debit)
- **WIP / Job Costs (4580 Interior Trim):** decreases by $305.28 (the duplicate cost is removed)
- **Atlantic Union Bank:** unchanged, still reconciled through May
- **Total Assets = Total Liabilities + Equity** ✓

### Safety checks before executing

- Re-confirm the payment has no other allocations (only the one to 4483)
- Re-confirm bill `48345SG004483` has no other payments or credits applied
- Re-confirm the accounting period for 03/19/2026 is still open (otherwise we'd need to post a reversing JE in the current period instead of hard-deleting)

If any check fails I'll surface it before making changes.
