# Per-project notification matrix — final plan

## Answers back

**#1 (Primary contact):** Confirmed. The matrix gets a "Primary" radio column. Only the Primary user is shown as the "From" sender name and the PM contact block inside the vendor email; the other checked users are BCC'd for internal visibility.

**#2 (Keep CM / Accounting Mgr dropdowns?):** Keep them. They're used in many non-email places, so removing them would break real features. Verified references:

- `construction_manager` powers:
  - Insurance alerts (`useInsuranceAlerts`)
  - "My Projects" card (`MyProjectsCard`)
  - Owner Dashboard → Active Jobs "PM" column (`ActiveJobsTable`)
  - PM bid notifications badge (`usePMBidNotifications`)
  - Project header display (`ProjectPage`)
  - Filtering in `useProjects` for PM-scoped views

- `accounting_manager` powers:
  - Accounting Manager bill queue (`useAccountingManagerBills`)
  - Accountant Dashboard → Jobs table sorting/display (`AccountantJobsTable`)
  - Project Managers directory (`useProjectManagers`)
  - "My Projects" card

→ Both dropdowns stay in Edit Project row #2, unchanged. The new notification matrix goes **below** them as its own section — it's purely additive and only drives who gets emails.

## UI (EditProjectDialog)

Row #2 stays as-is (CM, Accounting Mgr, Apartments). Add a new section beneath the Lots table titled **"Notifications"**:

```
User               | Primary | Bid | PO | Schedule | Bid Submitted | Accounting Reports
-------------------|---------|-----|----|----------|---------------|--------------------
Steven Chen (Owner)|   (o)   | [x] | [x]|   [x]    |     [x]       |       [ ]
Erica Gray         |   ( )   | [ ] | [ ]|   [ ]    |     [ ]       |       [x]
Sam Patel          |   ( )   | [x] | [ ]|   [x]    |     [ ]       |       [ ]
```

- Rows = every internal user from `useCompanyUsers`.
- **Primary** radio: exactly one user across the whole table. This user is the vendor-facing "From" name + PM contact block for every channel they're checked into.
- Column checkboxes: multi-select. Checked users receive that channel's emails.
- Save-on-toggle (same pattern as `RepresentativesTable`).
- Backfill: on first open for a project without a matrix row, pre-check the current `construction_manager` for Bid/PO/Schedule/Bid-Submitted and the `accounting_manager` for Accounting Reports, and mark `construction_manager` as Primary.

## Data model

New table:

```
project_notification_recipients
  project_id            uuid  → projects (cascade)
  user_id               uuid  → users
  is_primary            boolean default false
  receive_bid           boolean default false
  receive_po            boolean default false
  receive_schedule      boolean default false
  receive_bid_submitted boolean default false
  receive_accounting    boolean default false
  created_at / updated_at
  PRIMARY KEY (project_id, user_id)
```

Plus a partial unique index so only one Primary per project:
```
CREATE UNIQUE INDEX ON project_notification_recipients(project_id) WHERE is_primary;
```

RLS: readable/writable by users in the project's `home_builder_id` (mirrors `projects` policies). GRANTs for `authenticated` + `service_role`.

**One-time backfill migration:** for every existing project, insert
- `(project_id, construction_manager)` with `is_primary = true, receive_bid = receive_po = receive_schedule = receive_bid_submitted = true`
- `(project_id, accounting_manager)` with `receive_accounting = true`

So Day 1 behavior === today.

## Backend wiring

For each email channel, replace the `projects.construction_manager` lookup with a query on `project_notification_recipients`:

- `send-bid-package-email`, `send-bid-reminders`: `to:` = external reps (unchanged). Sender name + PM contact block = the Primary user IF `receive_bid = true`, else the first alphabetical user with `receive_bid = true`, else project owner. BCC all other `receive_bid = true` users.
- `send-po-email`: same, using `receive_po`.
- `send-schedule-notification` + `usePublishSchedule` payload: same, using `receive_schedule`.
- `send-bid-submission-email`: `to:` = **all** users with `receive_bid_submitted = true` (fall back to project owner if none).
- `SendReportsDialog`: pre-fill recipient list with all users where `receive_accounting = true`.

## Files touched

- Migration: create `project_notification_recipients` + backfill.
- New: `src/components/projects/ProjectNotificationsMatrix.tsx`.
- Edit: `EditProjectDialog.tsx` (mount the matrix), `usePublishSchedule.ts`, `usePOMutations.ts`, `SendReportsDialog.tsx`.
- Edge functions: `send-bid-package-email`, `send-bid-reminders`, `send-po-email`, `send-schedule-notification`, `send-bid-submission-email`.

Ready to build on approval.
