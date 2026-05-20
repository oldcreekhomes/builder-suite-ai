# Fix: ELG $276.25 (and similar) missing from bank reconciliation

## Root cause
`src/hooks/useBankReconciliation.ts` (lines ~223–228) fetches **all** `journal_entries` where `source_type = 'bill_payment'` with no project filter, no ordering, and no limit. Supabase caps that response at 1,000 rows. Bills tied to the reconciling job can fall outside that arbitrary 1,000, so their payment lines never reach the UI — even though the underlying `journal_entry_lines` for the bank account are unreconciled and correctly dated.

## Fix strategy
Filter by the job (and bank account) **before** fetching journal entries, so we only pull the JEs that could possibly belong to this reconciliation. Volume is <100 JEs/month, so this stays well under any limit.

### New order of operations (project-scoped path)
1. **Fetch bills for this project first**
   - `bills` where `project_id = projectId` (or `is null` when no project)
   - status != 'reversed'
   - Select id, reference_number, vendor_id, status
   - Use existing `batchedIn` only if needed; otherwise a single query (one project = small set).

2. **Fetch only the JEs for those bills**
   - `journal_entries` where `source_type='bill_payment'`, `is_reversal=false`, `reversed_at is null`, and `source_id IN (billIds)` via `batchedIn`.
   - Add explicit `.order('entry_date', { ascending: false }).limit(5000)` as a safety net.

3. **Fetch journal entry lines for the bank account** (unchanged logic, but now over a smaller, job-scoped JE set)
   - `journal_entry_lines` where `journal_entry_id IN (jeIds)`, `account_id = bankAccountId`, `credit > 0`, via `batchedIn`.

4. Build transactions exactly as today (cutoff, reconciled, vendor lookup, cost-code allocations) — no change to display rules.

### Consolidated bill_payments path (lines ~499+)
Already filters via `bill_payments` table by bank account; leave as-is. Add a defensive `.order('payment_date', { ascending: false })` if missing.

### Other unbounded fetches in the same file
Audit and add `.order(...).limit(...)` or batching on any other `journal_entries`/`journal_entry_lines` fetch that lacks bounds (lines ~735, ~836). No behavior change — just deterministic ordering and explicit limits so we never silently drop rows again.

## Files
- `src/hooks/useBankReconciliation.ts` — reorder steps in the legacy bill-payment branch (lines ~221–296) and add ordering/limits to other unbounded queries in the same file.

## Verification
- April reconciliation for the user's project shows the ELG Consulting ref 337 / $276.25 line.
- Existing reconciled and consolidated payments still appear correctly.
- No change to amounts, dates, or grouping.

## Out of scope
- No DB schema changes.
- No changes to write/update mutations.
- No UI changes.
