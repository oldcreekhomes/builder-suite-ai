## Goal

Single search box that matches both **person name** and **company name**, showing only users opted in to schedule notifications.

## Search behavior

- Type **"Matt"** → all people named Matt who are eligible (across internal users + reps).
- Type **"LCS"** → only reps whose company is LCS Site Services AND have `receive_schedule_notifications = true`.
- No "All companies" dropdown.

## Eligibility (who can appear at all)

- **Company representatives:** must have `receive_schedule_notifications = true` (already filtered in `useProjectResources`).
- **Internal users:** there is currently **no** `receive_schedule_notifications` column on `user_notification_preferences` for internal users. Two options — pick one:
  1. Treat all confirmed internal users from the same company as eligible (no new column).
  2. Add a `receive_schedule_notifications boolean` column to `user_notification_preferences` and filter on it (requires migration + a settings UI toggle later).

Default in this plan: **Option 1** (no schema change). Note the gap so we can add the toggle later.

## Changes — UI only

`src/components/schedule/ResourcesSelector.tsx`
- Remove the `Select` "All companies" dropdown, `companyFilter` state, `uniqueCompanies` memo, and its reset in `handleOpenChange`.
- Update `CommandInput` placeholder to "Search by name or company…".
- For each `CommandItem`, set `value` to `"{resourceName} {companyName ?? ''}"` so cmdk's built-in fuzzy matcher hits on either token.
- Internal Users group keeps showing (uses the owner's company name from the hook so "Old Creek" matches them too).

`src/hooks/useProjectResources.ts`
- Attach `companyName = ownerCompanyName` to each internal user resource (so the search value can include it). No filter changes for reps — `receive_schedule_notifications === true` stays.

## Result

- Searching "Matt" → all eligible people named Matt (internal + reps).
- Searching "LCS" → only LCS reps with schedule notifications enabled.
- Searching "Old Creek" → internal Old Creek Homes users.
