# Fix red dots on Cash Position — no re-mapping needed

## What happened
Your 2:51 PM Capital One sign-in worked: it brought in all 20 accounts with no error. But it came in as a brand-new, separate connection, so none of its accounts are tied to a job yet. Every job row still points at the old, dead connection, which is why every dot is still red. You do not have to reconnect or re-pick anything.

## Fix now (data only)
1. Move each job's assignment from the dead connection's account to the new connection's account with the same last-4 digits (13 jobs, e.g. Nob Hill ...3630, 6119 11th St ...4158, 413 E Nelson ...4164, 412 E Nelson ...4173, Woodstock ...5308, Custis ...5843, and the rest).
2. Assign ...5398 ($9,110.72) to 228 South Washington Street, as you asked earlier.
3. Remove the two dead Capital One connections (the 10/13 one and the single-account 10/21 one) so they stop showing errors.
4. Press Refresh — dots turn green with today's balances.

Accounting books, bills and reconciliations are not touched; Bank Balance only shows the live number.

## Permanent fix (so this never happens again)
When someone signs in to a bank again, the system automatically:
- carries each job's assignment over to the matching account (same bank + same last-4 digits) on the new sign-in,
- removes the old connection it replaced.

So a future re-sign-in just turns the dots green — no re-mapping.

## Technical details
- `supabase/functions/plaid/index.ts`, `exchange` action: after `syncConnection`, for each other `bank_connections` row with the same `owner_id` + `institution_name`, copy `project_id`/`account_id` from its `bank_connection_accounts` onto the new connection's accounts matched by `mask` (only where the new account is unassigned), then call `/item/remove` and delete the old connection (accounts cascade).
- One-time data update for connections `d7a118d3…` and `6a433be9…` → `7ab3c2b7…`, plus 5398 → project `dfad3ec5…` with its 1015 Capital One book account.
- Small test for the mask-matching carry-over rule.
