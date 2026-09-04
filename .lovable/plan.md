# Enter Multiple Checks — batch check entry across all jobs

## What you'll get

A new "Enter Multiple Checks" page that works exactly like Enter Multiple Deposits, but writes checks. It appears on the Owner Dashboard in the **Multiple Project Entries** card, directly below "Enter Multiple Deposits" — matching the bank's Quick Entry style from your screenshot: pick a template-like row per payment, fill date/amount/payee, submit all at once.

## Changes

1. **Owner Dashboard card** — add a second link: "Enter Multiple Checks" → `/multi-entry/checks`, description "Record checks across many projects in one screen."

2. **New page `/multi-entry/checks`** — mirrors the deposits page layout:
   - Same row grid: **Project**, **Date**, **Pay From (Bank)**, **Pay To** (vendor search), **Check #**, **Account**, **Description**, **Amount**, delete-row button.
   - Default Date picker at top that fills every row; running **Total**; Add Row / Clear / Save Batch buttons; 5 blank rows to start.
   - Picking a project auto-fills that project's default bank account (same defaults used by Pay Bill / Write Checks).
   - Only bank accounts enabled for the selected project appear; expense account picker respects the project's chart of accounts.

3. **Batch saving** — each row becomes a real posted check through the same code path as Write Checks (so journal entries, WIP handling, audit stamps, and balances are identical). All rows in one save share a batch ID.

4. **Batch history** — a "Multiple Checks Batches" table below the entry grid, same as deposits: Saved At, Saved By, # Checks, # Projects, Total; expand a row to see each check (date, project, bank, payee, check #, description, amount) and click through to it on that project's Transactions page. Batches with reconciled checks show a lock and can't be deleted; otherwise Delete Batch removes all checks in the batch after confirmation.

5. **Validation** — same rules as deposits: every filled row needs a project, bank account, expense account, and amount > 0 before saving; problems are listed per row.

## Technical notes

- Migration: add `multi_entry_batch_id uuid` (nullable, indexed) to `checks` so batches can be grouped — mirrors the existing column on `deposits`. No other schema change; no RLS change needed (existing checks policies apply).
- New files: `src/pages/MultipleChecks.tsx`, `src/components/multi-entry/MultiCheckTable.tsx`, `src/components/multi-entry/MultiCheckBatchHistory.tsx`, `src/hooks/useMultiCheckBatchSave.ts`, `src/hooks/useMultiCheckBatches.ts` — adapted copies of the deposit equivalents.
- `useMultiCheckBatchSave` reuses `useChecks().createCheck` per row with one `expense` line (account + amount + project), then stamps `multi_entry_batch_id` on the created checks.
- Route registered in `App.tsx` next to `/multi-entry/deposits`; link added in `MultipleProjectEntriesCard.tsx`.
- Amounts use the project's cent-precise math and 2-decimal formatting standards.
