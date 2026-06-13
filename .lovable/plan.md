# Per-Project Account Name Overrides

You're right about how it works today: the global Chart of Accounts (the `accounts` table) is the single source of truth. When a project loads its Chart of Accounts tab, it reads the global list and lets you check/uncheck which accounts are excluded for that project — but you can't rename them. So when "3120 Construction Management Fees" doesn't quite fit a particular job, you're stuck with the global label everywhere.

This plan adds a per-project **display name override** so you can rename an account just for one project, without touching the global Chart of Accounts or any other project.

## What you'll see in the UI

In **Edit Project → Chart of Accounts**, each account row's name itself becomes click-to-edit:

- Click the account name (e.g. `3120 - Construction Management Fees`) → it turns into an inline text input pre-filled with the current name.
- Press Enter or click away → saves. Press Esc → cancels.
- Once overridden, the row shows the new name with a subtle visual cue (italic + a small "overridden" dot) so you can tell it's project-specific.
- The account code (3120) is not editable — only the name.

No pencil icon, no three-dot menu — just click the name to edit.

That custom name then flows everywhere in this project: Balance Sheet, Income Statement, Journal Entry pickers, Bill/Check/Deposit account dropdowns, account registers, reports, PDF exports — anywhere this project displays an account name.

Other projects, and the global Chart of Accounts in Settings, are completely unaffected.

## Technical details

**New table** `project_account_overrides`:
- `project_id` → projects.id
- `account_id` → accounts.id
- `display_name` text
- unique (`project_id`, `account_id`)
- RLS: same tenant pattern as other project-scoped tables (filter by `home_builder_id` via the project)
- Audit columns auto-stamped by existing `set_audit_user()` trigger

**Resolution helper** (client-side): a `useProjectAccountNames(projectId)` hook returns a `Map<account_id, displayName>` for that project. A small util `resolveAccountName(account, overridesMap)` returns the override if present, else `account.name`.

**Wiring** — apply the resolver in the account-display surfaces for project-scoped views:
- `ProjectAccountsTab` (inline-editable name + display)
- Balance Sheet / Income Statement (project-scoped versions)
- Account register / Account Detail report
- Journal Entry, Bill, Check, Deposit, Credit Card, PO line account dropdowns when opened in a project context
- Project-scoped report PDFs/exports

Global pages (the master Chart of Accounts in Settings, company-wide reports without a project filter) keep using `account.name` as-is.

**No data migration needed** — the override table starts empty; every account falls back to its current global name until you rename it.

## Out of scope (per your answers)

- No "Reset to global" button — just clear/re-edit the field to whatever you want.
- Only the name is overridable — code, type, parent, and description stay global.
