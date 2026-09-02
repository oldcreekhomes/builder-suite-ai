# Organize Bank Statements by account

## Problem

Bank Statements is one flat list. With 4+ accounts (checking, savings, multiple cards) every statement piles into the same table, and the account is only implied by whatever the user typed into the file name ("2026/Savings/2026 | January AUB Savings.pdf"). Sorting is by date only, so Checking and Savings interleave and nothing is readable.

Confirmed in the database: the chart of accounts for 228 S Washington only has generic bank rows (1010 Atlantic Union Bank, 1015 Capital One, 2150 credit card). It has no "Atlantic Union - Savings", "Amex 50003", etc. — so statements need their own account list rather than being restricted to existing COA accounts.

## What changes

### 1. Per-project statement accounts

A new **Accounts** button sits immediately to the left of **Upload PDF**. It opens a small manager where you add, rename, reorder, and deactivate the statement accounts for this project, for example:

- Atlantic Union - Savings
- Atlantic Union - Checking
- Amex 50003
- Amex other
- Capital One - Savings
- Capital One - Checking

Each account may optionally be linked to a chart-of-accounts bank/credit-card account (useful later for reconciliation), but a plain name is enough. Deactivating an account keeps its statements; it just stops appearing in the upload picker.

### 2. Upload asks for the account

The upload dialog gains a required **Account** dropdown next to the existing Statement End Date, listing this project's statement accounts. Uploading several files at once assigns them all to the same account.

### 3. Grouped, collapsible list

The main table becomes one collapsible section per account, in the order you set:

```text
v Atlantic Union - Checking            12 statements
    File Name                Statement End Date   Uploaded   Size   ...
    2026 | January.pdf       01/31/26             08/27/26   1.0 MB  ...
    ...
> Atlantic Union - Savings              8 statements
> Amex 50003                            6 statements
> Unassigned                            3 statements
```

- Sections show a statement count; the most recent statement date is shown on the section header.
- Inside a section, statements sort by statement end date, newest first.
- Sections collapse/expand and remember their state while the dialog is open.
- A search box filters by file name across all groups.
- Statements with no account land in an **Unassigned** group at the bottom.

### 4. Assigning existing statements

Since existing file names are inconsistent, existing statements start as Unassigned. Two ways to fix them:

- **Edit** on any row now includes the Account dropdown.
- A **Move to account** bulk action: check rows in the Unassigned group and assign them all to one account in a single step.

The current file-name cleanup stays, so a name like `2026/Savings/2026 | January AUB Savings.pdf` still displays as typed — no auto-renaming.

## Technical detail

- New table `public.project_statement_accounts` (project_id, name, account_id nullable FK to `accounts`, sort_order, is_active, home_builder_id, audit columns) with GRANTs for `authenticated` + `service_role` and RLS scoped by `home_builder_id`, matching existing project-scoped tables.
- New nullable column `statement_account_id` on `project_files` referencing the new table (`ON DELETE SET NULL`); no change to existing rows.
- `src/components/accounting/BankStatementsDialog.tsx`: query joins the account, groups rows in memory, renders collapsible sections (shadcn `Collapsible`), adds the search input, Account select in the upload/edit dialogs, and the bulk-assign action.
- New `ManageStatementAccountsDialog` for the Accounts button, plus a `useProjectStatementAccounts` hook for list/create/rename/reorder/deactivate.
- No changes to reconciliation, journal, or bill logic.
