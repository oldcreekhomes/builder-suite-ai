# Fix: Removed employee (Kyleen) still the contact on outgoing emails

## Why the update didn't take

I checked the actual rows. On 214 N Granada right now:

- **Sohan Sahu** — Bid checked, but **not** primary (his row was updated today at 1:05 PM)
- **Kyleen Urtola** — Bid checked **and primary** (her row hasn't been touched since July 8)

Kyleen's user record is `access_revoked = true`, so the Notifications matrix hides her entirely. Checking Sohan only added him as a CC'd recipient — it never cleared Kyleen's star, because her hidden row isn't part of what the screen saves. The bid email reads the saved rows directly, finds a primary (Kyleen), and stamps her as the Contact. Same situation on **1 East Custis Avenue**.

So the change did save — it just couldn't reach the invisible row that was actually winning.

## Fix

1. **Data cleanup (one-time):** delete Kyleen's notification rows on both projects, and mark Sohan primary for Bid, PO, and Schedule on 214 N Granada so the email shows him immediately.

2. **Resolver hardening:** in the shared notification-recipients helper, skip any recipient whose user is revoked, unconfirmed, or pending removal — for both the primary contact and the CC list. A removed employee can then never be the contact or get CC'd on Bid, PO, Schedule, Bid Submitted, or Accounting emails, even if a stale row survives.

3. **Cleanup on removal (prevents recurrence):** purge a user's `project_notification_recipients` rows the moment their access is revoked or they're removed — in `revoke-employee-access` and `process-pending-removals`, plus a database trigger on `users` so it also happens for any path that flips `access_revoked` directly. Applies to every project, current and future.

4. **Sweep existing data:** one-time cleanup of recipient rows belonging to any already-revoked/pending-removal user across all projects, so no other project is sitting on the same hidden star.

## Technical notes

- Files touched: `supabase/functions/_shared/notification-recipients.ts` (active-user filter on receivers and primary), `supabase/functions/revoke-employee-access/index.ts`, `supabase/functions/process-pending-removals/index.ts`.
- Migration: trigger on `public.users` that deletes the user's `project_notification_recipients` rows when `access_revoked` becomes true or `pending_removal_at` is set; plus the one-time sweep DELETE.
- Fallback order is unchanged: starred primary → alphabetically-first checked user → Construction Manager → project owner. With Kyleen's row gone, 214 N Granada resolves to Sohan.
