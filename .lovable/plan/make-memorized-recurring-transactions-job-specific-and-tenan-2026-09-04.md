# Make memorized (recurring) transactions job-specific and tenant-safe

## What's wrong today

Verified in the database and code:

- `recurring_transactions` has no `project_id` column. The job is only buried inside `template_data.project_id`.
- `useRecurringTransactions` fetches every recurring transaction for the company with no project filter, so the Recurring tab and the yellow "X recurring transactions due" banner show the same records on every job.
- Both existing records ("Office Supplies - Computer", $186.19, next date 07/30/2026) belong to one company and both point at the same project — they are duplicates of each other, not another builder's data.
- Tenant isolation: the row-level rules do scope by owner, but the shared-access branch only recognizes users whose role is exactly `employee`. Other confirmed team roles (e.g. accountant) fall outside it.

So: no cross-builder leak today, but the job scoping is genuinely missing.

## What will change

1. **Store the job on the record.** Add a `project_id` column to recurring transactions, backfilled from the job already saved inside each template. New memorized checks / credit card charges / bills save the current job.
2. **Filter by job.** The Recurring tab and the due-transactions banner only list records for the job currently selected. On the company-wide Transactions page (no job selected), everything for the company shows, with a Project column so it is obvious which job each belongs to.
3. **Lock to the company.** Tighten access so a record is only ever visible to the company that created it, and extend the shared-access branch to all confirmed company members instead of only the `employee` role.
4. **Duplicates.** The two identical "Office Supplies - Computer" rows are the same template entered twice. One will be removed so the banner shows 1 due instead of 2.

## Technical notes

- Migration: `ALTER TABLE public.recurring_transactions ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;` backfill `project_id = (template_data->>'project_id')::uuid`; index on `(owner_id, project_id)`; replace the four policies so the shared branch uses the existing `home_builder_id` lookup for any confirmed member. `recurring_transaction_lines` policies updated the same way.
- `useRecurringTransactions(projectId?)`: add `projectId` to the query key and `.eq("project_id", projectId)` when provided; `dueTransactions` derives from the same filtered set.
- `MemorizeTransactionDialog` gains a `projectId` prop, passed from `WriteChecksContent` and `CreditCardsContent`, and writes it to the new column (template_data keeps its copy for existing behavior).
- `RecurringTransactionsContent` and `PendingRecurringBanner` accept and pass `projectId` (already threaded through `TransactionsTabs`).
- Data cleanup: delete one duplicate `recurring_transactions` row plus its lines.
