# Per-project notification matrix — final plan (v3)

Change from v2: **Primary is per-notification-type**, not project-wide. Each column has its own Primary contact who appears as the vendor-facing "From" name and PM contact block; every other checked user in that column is **CC'd** on the outgoing email (was BCC).

## UI (new "Notifications" tab in EditProjectDialog)

Tabs: **Project Details | Chart of Accounts | Notifications**

Each notification type gets a two-state checkbox per user:
- **Empty** — user does not receive this notification
- **Checked** — user is CC'd
- **Star / filled** — user is the Primary contact for this notification (max one per column)

Concrete UI: two controls per cell — a checkbox and a small star toggle to its right. Clicking the star auto-checks the box and clears any other star in the same column.

```
User                    | Bid          | PO           | Schedule     | Bid Submitted | Accounting Reports
------------------------|--------------|--------------|--------------|---------------|--------------------
Steven Chen (Owner)     | [x] ★        | [x] ★        | [x] ★        | [x] ★         | [ ]  ☆
Erica Gray              | [ ]  ☆       | [ ]  ☆       | [ ]  ☆       | [ ]  ☆        | [x] ★
Sam Patel               | [x]  ☆       | [ ]  ☆       | [x]  ☆       | [ ]  ☆        | [ ]  ☆
```

Rows = every internal user from `useCompanyUsers`. Save-on-toggle (optimistic). Legend under the table: "★ Primary contact (appears as sender) · ☑ CC'd on notification".

Rules:
- A column may have zero or one Primary. Zero-Primary falls back at send time to the project owner.
- Setting Primary also sets Checked (can't be Primary without being on the list).
- Unchecking a Primary clears the Primary flag for that column.

## Data model

```
project_notification_recipients
  project_id            uuid  → projects (cascade)
  user_id               uuid
  receive_bid           boolean default false
  receive_po            boolean default false
  receive_schedule      boolean default false
  receive_bid_submitted boolean default false
  receive_accounting    boolean default false
  is_primary_bid            boolean default false
  is_primary_po             boolean default false
  is_primary_schedule       boolean default false
  is_primary_bid_submitted  boolean default false
  is_primary_accounting     boolean default false
  created_at / updated_at
  PRIMARY KEY (project_id, user_id)
```

Five partial unique indexes so each column has at most one Primary per project:
```
CREATE UNIQUE INDEX ON project_notification_recipients(project_id) WHERE is_primary_bid;
CREATE UNIQUE INDEX ON project_notification_recipients(project_id) WHERE is_primary_po;
CREATE UNIQUE INDEX ON project_notification_recipients(project_id) WHERE is_primary_schedule;
CREATE UNIQUE INDEX ON project_notification_recipients(project_id) WHERE is_primary_bid_submitted;
CREATE UNIQUE INDEX ON project_notification_recipients(project_id) WHERE is_primary_accounting;
```

Check constraint per column: `is_primary_X` implies `receive_X`.

RLS mirrors `projects` (tenant-scoped by `home_builder_id`). GRANTs for `authenticated` + `service_role`.

**One-time backfill:** for every project,
- CM row: `receive_bid=po=schedule=bid_submitted=true`, `is_primary_bid=po=schedule=bid_submitted=true`.
- Accounting Mgr row (or CM row if same user): `receive_accounting=true`, `is_primary_accounting=true`.

So Day-1 behavior === today, with CM primary on 4 channels and Accounting Mgr primary on 1.

## Backend wiring (edge functions)

For each channel, replace `projects.construction_manager` lookups with:
- **Primary user** = row where `is_primary_<channel>=true` (fall back to any `receive_<channel>=true` alphabetical, else project owner).
- **CC list** = other users where `receive_<channel>=true`.

Then:
- `send-bid-package-email`, `send-bid-reminders`: sender name + PM contact block = Primary. `cc:` = CC list.
- `send-po-email`: same via `_po`.
- `send-schedule-notification` (+ `usePublishSchedule` payload): same via `_schedule`.
- `send-bid-submission-email`: `to:` = Primary, `cc:` = CC list.
- `SendReportsDialog`: pre-fill the "To" field with Primary email and "CC" field with the CC list.

## Files touched

- Migration: new table + backfill.
- New: `src/components/projects/ProjectNotificationsMatrix.tsx`, `src/hooks/useProjectNotificationRecipients.ts`.
- Edit: `EditProjectDialog.tsx` (new tab), `usePublishSchedule.ts`, `usePOMutations.ts`, `SendReportsDialog.tsx`, and the 5 edge functions.

Ready to build on approval.
