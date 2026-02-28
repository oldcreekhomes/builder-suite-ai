
# Reset Onboarding Step 8 for Testing

## What needs to happen
Reset two fields in the `onboarding_progress` table for Dorian Gray Homes (owner `3e482bbc-139c-4ebc-a006-d9290287d2d5`):

- `employees_invited` -> `false` (unchecks Step 8)
- `dismissed` -> `false` (makes the checklist visible again, since all 8 steps were previously completed and dismissed)

## How
Create a temporary edge function that uses the service role to run this update, call it once, verify the result, then delete the function.

```sql
UPDATE onboarding_progress
SET employees_invited = false, dismissed = false
WHERE home_builder_id = '3e482bbc-139c-4ebc-a006-d9290287d2d5';
```

After this, refreshing the dashboard will show the onboarding checklist with Step 8 ("Invite Employees") unchecked and ready to test.
