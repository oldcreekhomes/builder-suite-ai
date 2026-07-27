## What's happening

Kyleen was removed on a scheduled basis: her user row still has `access_revoked = false` with `pending_removal_at = Jul 27, 2026 12:06 UTC` (verified in the database). Danny, who is fully revoked, is already hidden from chat because `useCompanyUsers` filters `access_revoked = false`. Kyleen isn't filtered because her removal hasn't been processed by the nightly job yet, so she still appears in the Messages sidebar and other team lists.

## Fix

In `src/hooks/useCompanyUsers.ts` (the single source for the chat sidebar, floating chat windows, notification matrices, project dialogs and issue assignment), add `.is('pending_removal_at', null)` alongside the existing `confirmed` / `access_revoked` filters in both the owner branch and the internal-user branch.

Effect: anyone marked for removal disappears immediately from chat lists and team pickers, while their login access still ends on the scheduled date (that behavior is unchanged). If the owner clicks "Undo Removal", `pending_removal_at` is cleared and the user reappears automatically.

## Notes

- No database change and no change to the removal/revocation workflow itself.
- Settings > Employees still shows her with the "Access ends Jul 27, 2026" badge so the owner can undo the removal — that table uses its own query and isn't affected.
