# Employee Activity: detailed rows and an accurate last action

## Problems
- The single "Banking" row lumps several kinds of work together.
- File uploads don't count. Jole Ann uploaded 3 bank statements and created 2 folders at 7:42–7:43pm, but Files shows 0 and Last action still says "3 hours ago". File records store who uploaded them under a different field name than the card looks for, so they're skipped.
- Emailed reports aren't saved anywhere, so they can't be counted.
- Only saved work counts. Someone reviewing bills, reading reports or reconciling without saving looks idle.

## Changes
1. **Split Banking into its own rows**, each counted for the last 8 hours, 24 hours, week and month:
   - Bill Payments
   - Checks
   - Deposits
   - Credit Cards
   - Reconciliations
   - Reports Emailed (new)
2. **Fix Files** so uploads and new folders count. They'll count toward Last action too.
3. **Log every report email** (who sent it, which project, when). It counts in the Reports Emailed row.
4. **Track time spent in the app.** While someone has the app open and in use, record their activity about once a minute. Last action then becomes the latest of saved work or time in the app. You'll see "Active now" whenever someone is actually working, even if they haven't saved anything.
5. **Check the Banking numbers.** Before splitting the rows, confirm the 785 is real work and not repeated automatic updates, for example reconciliation rows being re-saved as items are checked off. Leave out any automatic updates like that.

## Technical details
- `get_employee_activity_summary`: map `project_files.uploaded_by`/`uploaded_at` and the owner field on `project_folders` explicitly. Replace the `banking_*` fields with `payments_*`, `checks_*`, `deposits_*`, `credit_cards_*`, `reconciliations_*` and `reports_*` fields. Last action = the latest of all activity and `users.last_active_at`.
- New table `report_email_log` (id, home_builder_id, project_id, sent_by, sent_at, recipients). Grant access and turn on access rules scoped to the builder. `send-accounting-reports` inserts one row per send, using the caller's user id.
- New `users.last_active_at` column. A `touch_last_active()` function limited to the signed-in user. A small hook in the app's main layout calls it every 60s while the tab is visible and the user has clicked or typed in the last 5 minutes.
- Update `EmployeeActivityRow` and the detail table rows in `EmployeeActivitySection`.
