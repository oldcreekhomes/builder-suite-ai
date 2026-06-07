## Global Reconciliation Cleared-Marker Backfill

Run a one-time, system-wide pass that walks **every** `bank_reconciliations` row with `status = 'completed'` (across all home builders, projects, and bank accounts) and stamps the cleared markers on the underlying transaction rows they reference.

### What gets stamped

For each completed reconciliation, read its `checked_transaction_ids` and, where the matching row is currently missing its cleared marker, set:

- `reconciled = true`
- `reconciliation_id = <that reconciliation's id>`
- `reconciliation_date = <that reconciliation's statement_date>`
- `updated_at = now()`

Applied to all five transaction tables that can appear in a reconciliation:

1. `checks`
2. `deposits`
3. `bills` (and/or `bill_payments` where applicable)
4. `credit_cards`
5. `journal_entry_lines`

### Safety rules

- **Idempotent.** A row that already has a `reconciliation_id` is left alone — we never overwrite a row that is already attributed to a different reconciliation.
- **No financial data changes.** No amounts, dates, accounts, memos, projects, or cost codes are touched. Only the cleared/reconciliation stamp fields above.
- **Scoped to completed reconciliations only.** In-progress reconciliations are ignored.
- **All tenants.** Runs once globally; not filtered by project or home builder.

### Permanent safety net (same migration)

Install the `sync_reconciliation_row_flags()` trigger on `bank_reconciliations` (AFTER INSERT OR UPDATE OF status, checked_transaction_ids) so that from this point forward, completing or editing a reconciliation **always** stamps the matching rows automatically — regardless of which app code path performed the action. This prevents the drift from recurring.

### Verification after run

Report counts per table of rows newly stamped, and confirm that for the user's current project (103 East Oxford) the historical 2024–2025 transactions in the bank register now show as cleared.

### Out of scope

- No UI changes.
- No changes to reconciliation math, balances, or statement records.
- No deletion or merging of any reconciliation records.