# One-Time Notification Backfill

Run a single SQL migration that populates `project_notification_recipients` for **every existing project** so its notification settings mirror the project's current `construction_manager` and `accounting_manager` assignments. After this runs, you won't need to touch any project manually — new/updated matrix entries only happen when you change them going forward.

## What the migration does

For every project in the database:

1. **Construction Manager → Primary for 4 channels**
   Where `projects.construction_manager IS NOT NULL`, upsert a row for that user with:
   - `receive_bid = true`, `is_primary_bid = true`
   - `receive_po = true`, `is_primary_po = true`
   - `receive_schedule = true`, `is_primary_schedule = true`
   - `receive_bid_submitted = true`, `is_primary_bid_submitted = true`

2. **Accounting Manager → Primary for Accounting Reports**
   Where `projects.accounting_manager IS NOT NULL`, upsert a row for that user with:
   - `receive_accounting = true`, `is_primary_accounting = true`
   If the accounting_manager is the same user as the construction_manager, the existing row is updated to flip the accounting flags on (rather than creating a duplicate).

3. **Idempotent** — uses `ON CONFLICT (project_id, user_id) DO UPDATE` so re-running is safe, and only turns flags **on**; it never clears anything a user has already customized.

## What it does NOT touch

- Any project where you've already set custom recipients (existing `true` flags stay `true`).
- The `construction_manager` / `accounting_manager` dropdowns themselves (still used for insurance, bill queues, dashboard roles).
- New projects going forward — those already get backfilled on create via the existing logic.

## After it runs

Every project will have its Notifications tab pre-populated to match today's construction/accounting manager setup, so vendor emails, PO emails, schedule notifications, bid-submission notices, and accounting reports will keep going to the same people as before with zero manual work from you.
