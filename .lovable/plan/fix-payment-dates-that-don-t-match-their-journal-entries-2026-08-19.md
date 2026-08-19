# Fix payment dates that don't match their journal entries

## What's actually wrong

The 126 Longview Capital One register shows a $6,444.00 payment (Creative Landscaping, "Blue Maid Holly Shrub", Ref 3147) dated **08/03/2026**, but the journal entry behind that same payment is dated **07/03/2026**.

Confirmed in the data:
- `bill_payments.payment_date = 2026-08-03`, `total_amount = 6,444.00`
- Its journal entry (Capital One credit + A/P debit) has `entry_date = 2026-07-03`

The register lists rows by the payment date, while the Balance Sheet (and the register's running balance) totals by journal entry date. So as of 7/31/2026 the Balance Sheet already subtracts the $6,444, giving $21,503.38 instead of $27,947.38 — exactly the $6,444.00 difference. Changing the Balance Sheet date to 8/6 makes both sides include it again, which is why it looks correct there.

## Why it happened

Editing a consolidated bill payment's date in the reconciliation screen updates only `bill_payments.payment_date`; it never updates the linked journal entry's `entry_date`. Same gap for the amount edit. Once edited, the register and the financial statements permanently disagree.

Five other payments across 100 Nob Hill, 115 E. Oceanwatch, and 126 Longview (Ref 2149810) have the same date drift.

## What will be done

1. **Realign the six drifted payments** so each journal entry's date matches its payment date, including the 126 Longview $6,444.00 payment (journal entry moves 07/03 → 08/03). No amounts change, nothing is deleted.
2. **Close the hole**: when a payment's date is edited, also update the related journal entry date; when the amount is edited, also update the journal entry lines, so the register and the financial statements can never diverge again.
3. **Add a safeguard** so any future date/amount edit to a payment keeps the journal entry in step, and skip edits that fall in a closed accounting period.
4. **Verify** 126 Longview as of 7/31/2026 shows Capital One at **$27,947.38** on both the Balance Sheet and the 1015 register, and that the Balance Sheet still balances.

## Technical notes

- Data fix: `UPDATE journal_entries SET entry_date = <bill_payments.payment_date>` for the six payments where the dates disagree (single payment, single journal entry — no ambiguity).
- Code fix in `src/hooks/useBankReconciliation.ts` → `updateBillPaymentTransaction`: for `consolidated_bill_payment`, after updating `bill_payments`, resolve the related journal entries (`source_type = 'bill_payment'` for the payment's allocated bills) and update `entry_date`; for the amount branch, update the matching A/P and bank journal lines with cent-precise values.
- No change to how the Balance Sheet or register compute balances — entry date stays the single source of truth for financial statements.
