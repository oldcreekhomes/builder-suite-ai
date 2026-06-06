## Fix Status column for Bill Pmt - Check rows in Account Detail (Bank Register)

### Problem
In `AccountDetailDialog` (bank/account register), `Bill Pmt - Check` rows show **Approved** even when the underlying bank journal-entry lines are reconciled (e.g., Jan–Apr 2026, where the bank is reconciled through April). Two issues:

1. **Reconciliation source is wrong for consolidated payment rows.** The synthetic row reads `bill_payments.reconciled / reconciliation_id / reconciliation_date`. Those flags are out of sync with reality in many rows. The bank-side `journal_entry_lines.reconciled` is the source of truth (and matches the lock icon / reconciliation history). Confirmed via DB: many `bill_payments` rows have `reconciled=false` while the matching JE line on the bank account has `reconciled=true` with `reconciliation_date='2026-04-30'`.
2. **Wrong label for bill payment rows.** A bill payment that has been issued but not yet cleared is **Paid**, not **Approved**. "Approved" applies to bills, not to bill payments / checks. The user wants the label to read **Paid** until it clears the bank, then **Cleared**.

### Scope
- File: `src/components/accounting/AccountDetailDialog.tsx` only.
- Affects only the Status column rendering and the `reconciled` derivation for bill-payment-type rows (Bill Pmt - Check, plus standalone Check rows that came from a bill payment). No DB changes. No edits to other dialogs, no edits to bill / reconciliation logic.

### Changes

1. **Derive reconciliation from bank-side JE lines for consolidated bill payment rows.**
   When building the synthetic `consolidated_bill_payment` row, look up the journal-entry lines on the current bank `accountId` for journal entries where `source_type='bill_payment'` and `source_id IN (bill_ids of this payment's allocations)`. If every such bank line is reconciled (or any of them is reconciled and covers the full payment), mark the synthetic row `reconciled=true` and copy through the `reconciliation_date`. Fall back to the existing `bill_payments.reconciled` flag only when no JE line is found.

2. **Status label for bill-payment-type rows = "Paid" (not "Approved") when not reconciled.**
   In the Status column renderer (around line 1426–1433), when the row's source is a bill payment (`source_type === 'consolidated_bill_payment'` OR the row is a Bill Pmt - Check / Check that originated from a bill payment), use:
   - `Cleared` if reconciled
   - `Paid` if not reconciled
   - (other source types keep their existing Pending / Approved / Cleared labels)

3. **Status badge styling for "Paid"** uses the same neutral/blue badge style currently used for "Approved" (no new color tokens introduced) so the visual treatment stays consistent with the rest of the register.

### Out of scope
- No backfill of `bill_payments.reconciled` flags (we just stop trusting them as the sole source).
- No changes to the lock icon logic (already correctly driven by closed-period rules).
- No changes to bill rows, deposits, JE rows, or credit card rows.
- No changes to the reconciliation workflow itself.

### Verification
After the change, reopen the `1010 - Atlantic Union Bank` register: Jan/Feb/Mar/Apr Bill Pmt - Check rows that are locked (closed period & reconciled) should display **Cleared**. May/Jun bill payments that are issued but not yet reconciled should display **Paid** (no longer "Approved"). Plain `Check` rows continue to show Cleared/Paid based on their bank JE line's reconciled flag.