## Multiple Project Entries — Deposits

Add a fast, batch deposit-entry workflow so you can record deposits across many projects from one screen instead of opening each project.

### 1. Owner Dashboard: new card

Add a **"Multiple Project Entries"** card to the Owner Dashboard, placed to the right of the Active Jobs table (same row).

Content:
- Header: **Multiple Project Entries**
- Row: **Enter Multiple Deposits** → button/link → `/multi-entry/deposits`
- (Card is structured so we can add "Enter Multiple Checks", etc. later.)

### 2. New page: `/multi-entry/deposits`

Uses the standard app shell (sidebar + `CompanyDashboardHeader`), title **"Enter Multiple Deposits"**.

**Top bar**
- Default **Date** picker (defaults to today). Applies to all new rows; each row inherits this on add.
- **+ Add Row** button.
- Running **Total** on the right.

**Table** (each row = one deposit, one line):

| Project | Date | Deposit To (Bank) | Received From | Check # | Account | Description | Amount | Action |

Column behavior:
- **Project**: searchable dropdown listing all active projects, exact same set/order as the Active Jobs dashboard list (grouped by status: Under Construction, Permitting, In Design, etc.). Required.
- **Date**: per-row, prefilled from top date but editable.
- **Deposit To**: bank-account picker; auto-prefills with the project's default deposit account when a project is picked (falls back to company default). Required.
- **Received From**: same vendor/subcontractor search used on Make Deposits. Optional.
- **Check #**: optional text.
- **Account**: chart-of-accounts picker (income/deposit accounts), same list Make Deposits uses. Required.
- **Description**: free text.
- **Amount**: currency input, cent-precise. Required > 0.
- **Action**: delete row.

Start with 5 blank rows; "+ Add Row" appends more. Rows with no project + no amount are ignored on save.

**Footer buttons**: Clear · Save Batch.

### 3. Save behavior

On **Save Batch**:
1. Validate every non-empty row (project, bank, account, amount > 0). Show inline errors; do not save partial batches.
2. Generate one `batch_id` (uuid) client-side.
3. For each row, insert one `deposits` row + one `deposit_lines` row using the same code path/hook as the single-project Make Deposits page (so accounting, GL posting, RLS, closed-period checks, audit stamping all behave identically). Tag each deposit with `multi_entry_batch_id = batch_id`.
4. Each deposit is scoped to its selected `project_id`, so it appears in that project's Deposits list on the chosen date exactly as if entered manually.
5. On success: toast "Saved N deposits across M projects", clear the table, refresh the batch history below.

### 4. Batch review table (below entry table)

Grouped by batch save. Columns:

| Saved At | Saved By | # Deposits | # Projects | Total | Actions |

- Row expands to show the individual deposits in that batch (project, bank, received from, account, amount, date), each linking to that project's Deposits page for that deposit.
- Actions: **View** (expand) and **Delete Batch** (with confirm; deletes all deposits in the batch, respecting closed-period and reconciliation locks — any locked rows block the delete with a clear message).

### 5. Data model change

Add one nullable column to `deposits`:
- `multi_entry_batch_id uuid null` (indexed).

No new table needed — the batch is just a `group by multi_entry_batch_id` over `deposits`. Existing RLS, grants, and Make Deposits code paths are reused unchanged.

### 6. Permissions

- Card + page visible to users who can create deposits (same permission gate as the Make Deposits page today).
- Nothing to change for tenants: uses existing multi-tenant deposit RLS.

### Files touched (technical)

- New: `src/components/owner-dashboard/MultipleProjectEntriesCard.tsx`
- New page: `src/pages/MultipleDeposits.tsx` + route in `src/App.tsx` / `src/nav-items.tsx`
- New: `src/components/multi-entry/MultiDepositTable.tsx`, `MultiDepositRow.tsx`, `MultiDepositBatchHistory.tsx`
- New hook: `src/hooks/useMultiDepositBatchSave.ts` (wraps existing deposit create logic in a loop with one batch id)
- New hook: `src/hooks/useMultiDepositBatches.ts` (groups deposits by `multi_entry_batch_id`)
- Update: `src/components/owner-dashboard/ActiveJobsTable.tsx` parent grid in `src/pages/Index.tsx` to place the new card to the right
- Migration: add `deposits.multi_entry_batch_id uuid` + index

### Out of scope (per your answers)

- Checks, credit cards, journal entries — deposits only for now. Card is built so those links can be added later without rework.
- Multi-line deposits per row — one line per row.
