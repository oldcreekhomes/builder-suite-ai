# Fix: Removed employees still receiving/sending notifications

## What's actually happening

Kyleen was revoked from the company (her user record has `access_revoked = true`), so she no longer appears in the Project Notifications matrix. But her *saved* notification rows were never cleared. In the database she is still recorded as:

- **214 N Granada** — primary + receiving for Bid, PO, Schedule, Bid Submitted
- **1 East Custis Avenue** — primary + receiving for Bid, PO, Schedule, Bid Submitted

The bid email resolver reads those rows directly and picks the primary, so it stamped Kyleen as the contact even though the UI shows nobody starred. Sohan was CC'd because he is a checked (non-primary) Bid recipient.

## Fix

1. **Data cleanup (one-time):** delete Kyleen's `project_notification_recipients` rows on both projects. After that, with no primary set, the Bid contact falls back to the alphabetically-first checked user — Sohan Sahu — which is what you want.

2. **Resolver hardening:** in the shared notification-recipients helper, ignore any recipient whose user is `access_revoked`, unconfirmed, or pending removal — for both primary and CC. This means a revoked employee can never appear as the contact or get CC'd on Bid, PO, Schedule, Bid Submitted, or Accounting emails, even if stale rows exist.

3. **Cleanup on revoke/remove:** when an employee's access is revoked or they're removed from the company, delete their `project_notification_recipients` rows so the matrix and the emails stay in sync going forward.

## Technical notes

- Files touched: `supabase/functions/_shared/notification-recipients.ts` (filter revoked/unconfirmed/pending-removal users), plus the employee revoke/remove paths (`revoke-employee-access`, `delete-employee`, `process-pending-removals` edge functions) to purge recipient rows.
- Data cleanup is a targeted `DELETE` on `project_notification_recipients` for user `1cb267af-...` (Kyleen); no other records are affected.
- No change to the fallback order: starred primary → alphabetically-first checked user → Construction Manager → project owner.
