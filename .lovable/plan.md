# Unblock closing June 2026 at 6119 11th Street

## What's wrong
Your June reconciliation for 1010 Atlantic Union Bank is finished and correct ($0.00 ending balance). But there's a second, leftover June 30 reconciliation for the same account that was started 4 minutes earlier (Jul 7, 00:15 UTC) and never finished. It's stuck as "in progress," and Close the Books sees that unfinished one and refuses.

The bank statements and completed reconciliations all match — nothing about the numbers is off.

## Fix
1. Delete the abandoned in-progress June 30 reconciliation (`66e7a254-834c-4199-aed0-cc80c9aa33e2`) — first confirm it has no cleared items or links that the completed one depends on; if it does, detach them safely.
2. Leave the completed June 30 reconciliation (`1bb3d211-...`) untouched.
3. Prevent a repeat: block starting a new reconciliation for an account/date when one already exists for that same account and statement date (return the existing one instead).
4. Make the Close Books error name the account and date of the unfinished reconciliation so you know exactly where to look.

## Result
You can close June 30, 2026 immediately after step 1.
