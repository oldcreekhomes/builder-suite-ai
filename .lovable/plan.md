# Per-Project Default Bank Account

## Goal
Let each project override the tenant-wide default bank account. New projects inherit the current global default automatically; users can change it freely afterward from Edit Project → Chart of Accounts.

## Resolution order (used by Write Checks, Make Deposits, Pay Bill, Reconcile)
1. **Project default** — if the transaction has a `projectId` and that project has a default bank set
2. **Global default** — tenant-wide default (`accounts.is_default_bank = true`)
3. **None** — user picks manually

Company-overhead transactions (no `projectId`) always use the global default.

## Database

New table `public.project_default_bank_accounts`:
- `project_id` (PK, FK → projects, cascade delete)
- `account_id` (FK → accounts, cascade delete)
- `home_builder_id` (for RLS / tenant isolation)
- standard audit columns

One row per project = enforced single default. RLS scoped to `home_builder_id`. Standard GRANTs for `authenticated` + `service_role`.

**Backfill / new-project seeding:** when a project is created, if a global default bank exists, insert a matching row. Implemented via a Postgres trigger on `projects` INSERT so it works regardless of which client creates the project.

## UI changes

**Edit Project → Chart of Accounts dialog**
- Next to each enabled bank account (subtype = 'bank'), add the same `Star` toggle used in the global Chart of Accounts.
- Filled star = current project default; click another to switch; click the active one to clear (falls back to global).
- Only bank accounts the project has enabled can be starred.
- Small helper text under the section: "Defaults to the company-wide bank account unless overridden here."

No other dialogs change.

## Code changes

**New hook** `src/hooks/useProjectDefaultBankAccountId.ts`
- Args: `projectId?: string`
- Returns: project override → global default → `null`
- Reuses existing `useDefaultBankAccountId` as the global fallback.

**Updated callers** (swap `useDefaultBankAccountId` for the new project-aware hook, passing the current `projectId` when available):
- `src/components/transactions/WriteChecksContent.tsx`
- `src/components/transactions/MakeDepositsContent.tsx`
- `src/components/transactions/ReconcileAccountsContent.tsx`
- `src/components/PayBillDialog.tsx`

When `projectId` is undefined (overhead), the hook naturally falls through to the global default — no special-casing needed.

**Edit Project dialog** (the Chart of Accounts tab component) — add the star column + mutation to upsert/delete the `project_default_bank_accounts` row.

## Technical notes

- Unique constraint on `project_id` guarantees one default per project.
- Cascade deletes keep the table clean when a project or account is removed.
- The global default starring UI in `ChartOfAccountsTab.tsx` is unchanged.
- Existing projects get no automatic backfill row — they'll naturally fall through to the global default until a user stars something at the project level. (Confirm if you'd prefer a one-time backfill for all existing projects instead.)
