## What's happening

Trimble $99.99 on 413 E Nelson **is** paid AND **is** reconciled — the payment is in the May 2026 Atlantic Union reconciliation. But the Reconciliation Review dialog isn't showing it.

## Root cause

When a reconciliation is completed, the app stamps `bill_payments.reconciliation_id`, but it does **not** stamp the underlying `journal_entry_lines.reconciliation_id` on the bank side of that payment's journal entry. The Reconciliation Review dialog reads from `journal_entry_lines.reconciliation_id`, so the payment is invisible there even though it's fully reconciled.

This is systemic: **244 reconciled bill payments** across the tenant are in this state.

## Plan

1. **Backfill (data)** — For every `bill_payments` row where `reconciled = true` and `reconciliation_id` is set, stamp the matching `journal_entry_lines.reconciliation_id` (bank-account credit line on the payment's JE) with the same reconciliation id. This immediately fixes all 244 existing payments, including the Trimble one.

2. **Fix the completion path (code)** — Update the reconciliation-completion logic so that whenever it stamps `bill_payments.reconciliation_id`, it also stamps the corresponding JE bank-side lines. This prevents new payments from falling into the same hole.

3. **Verify** — Reopen the May 2026 reconciliation on 413 E Nelson and confirm Trimble $99.99 now appears in "Checks & Bill Payments Cleared" and the total updates to $1,363.03.

## Technical details

- Backfill query joins `bill_payments -> bill_payment_allocations -> journal_entries (source_type='bill_payment', source_id=bill_id) -> journal_entry_lines` on `account_id = bill_payments.payment_account_id` where `credit > 0`, then sets `reconciliation_id`.
- Completion code lives in the reconciliation "complete" mutation — I'll locate the exact file after approval and make the JE-line stamp part of the same transaction.
- No schema changes.