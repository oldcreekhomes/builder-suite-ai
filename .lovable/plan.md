## Problem

In the `2010 - Accounts Payable` register (opened from the Balance Sheet), the **Hide Paid** toggle is ON by default but several fully-paid bills and their matching `Bill Pmt - Check` rows still appear (e.g. RC Fields $2,475 bill on 11/14/2025 and its 01/08/2026 payment, OCH at Oxford $316.57, etc.). When Hide Paid is on, only bills with an open balance should remain in the list.

The footer totals (34 bills / $63,311.58) actually match the current open AP balance, so the math is right — the row visibility filter is the only thing wrong.

## Root cause

The visibility filter in `AccountDetailDialog.tsx` only hides a `bill` / `bill_payment` / `consolidated_bill_payment` row when `txn.isPaid === true`. `isPaid` is sourced exclusively from a per-bill calculation:

- With `asOfDate` (the case used by the AP click-through from Balance Sheet): `billsPaidBeforeAsOf` is built by summing AP-account debits vs. credits per `bills.id`. Any bill whose AP credit/debit lines are not all attributable to a single `bills.id` (consolidated multi-bill payments, reversed-and-recreated bills, partial reference-number rewrites, payments whose JE `source_id` resolves to a different bill row) silently fails this check and stays visible.
- Without `asOfDate`: it falls back to `bill.amount_paid >= bill.total_amount || bill.status === 'paid'`, which is not consulted in the AP-from-BS path even though `bills.status = 'paid'` is already true in the DB for the leaking rows.

So bills that the database already considers paid (and their payment rows) leak through the filter.

## Fix

Make Hide Paid a strict "open balance only" filter in `AccountDetailDialog.tsx`:

1. **Treat a bill as paid for Hide Paid purposes when ANY of these is true:**
   - `bill.status === 'paid'`
   - `bill.amount_paid` (cent-precise) `>= bill.total_amount`
   - Existing historical `billsPaidBeforeAsOf` membership (kept for as-of correctness)
   - Successor-of-reversed-paid-bill mapping (already present, keep it)

2. **Propagate `isPaid` to every row tied to a paid bill:**
   - `bill` rows → hidden when bill is paid.
   - `bill_payment` rows → hidden when their parent bill is paid (today this is already wired through `billsMap`, but with the broader paid definition above it will now cover the leaking rows).
   - `consolidated_bill_payment` rows → hidden when every bill in `includedBillPayments` is paid (already always `isPaid: true`, no change).

3. **Don't change** the running balance / opening balance / totals / status badge / `as of date` query logic. Only the boolean used by the Hide Paid filter is broadened.

4. **Verification after edit:**
   - Confirm RC Fields 11/14/2025 + its 01/08/2026 payment disappear with Hide Paid on.
   - Confirm the footer still reads 34 bills / $63,311.58 (or recompute from DB if it shifts; current value matches the live open AP balance so it should stay).
   - Confirm partial payments stay visible (an unpaid remainder must still appear).
   - Confirm toggling Hide Paid OFF restores every row exactly as today.

## Files touched

- `src/components/accounting/AccountDetailDialog.tsx` — broaden the paid-bill detection used for the Hide Paid filter and ensure `bill_payment` rows inherit that flag from `billsMap`.

No DB migrations, no changes to Balance Sheet, AP Aging report, or any other surface.
