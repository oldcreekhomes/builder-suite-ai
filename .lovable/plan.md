## Diagnosis

The journal-entry count is inflated because the activity summary currently counts every `journal_entries.updated_by` row as a user action. For Matt Gray, the database shows:

- 370 journal entries created in the last 30 days.
- 2,604 journal entries updated in the last 30 days.
- Almost all of those updates happened in one minute on 2026-05-04, across bill, bill payment, check, deposit, and manual journal entries.
- Those look like bulk/system accounting maintenance updates being attributed to Matt, not 2,974 manual journal entries he personally entered.

So the current “JEs” bucket is mixing true manual journal entry work with generated accounting backend rows from bills, checks, deposits, and payments.

## Plan

1. **Change the Employee Activity SQL to count user-facing actions only**
   - Keep `journal_entries` in the employee activity system, but only count manual journal entries in the `JEs` domain.
   - Exclude generated journal entries with `source_type` like `bill`, `bill_payment`, `check`, and `deposit` from the `JEs` bucket.
   - Avoid counting broad bulk `updated_at` maintenance events as employee activity.

2. **Move generated accounting activity to the user-facing source domains**
   - Bills should be represented by `bills` / pending bill upload actions, not their generated journal entries.
   - Checks and deposits should not inflate the JE domain unless we intentionally add separate “Checks” / “Deposits” domains later.
   - Manual journal entries should remain visible as `JEs`.

3. **Preserve the existing expanded breakdown UI**
   - The current 8h / 24h / week / month matrix stays in place.
   - Only the backend counts change, so the table should immediately show more believable values after the migration.

4. **Add a clarifying label/tooltip if needed**
   - Update the `JEs` display text to indicate it means manual journal entries, so users do not interpret generated accounting entries as manual work.

## Expected result

Matt’s `JEs` count should drop from thousands to a small number matching actual manual journal entry work, while bills/checks/deposits continue to be tracked through their own user-facing records instead of duplicated through generated accounting rows.

## Technical details

- Update `public.get_employee_activity_summary` in a Supabase migration.
- In the function’s activity collection, special-case `journal_entries` instead of treating it like all parent tables.
- Count only rows where `source_type = 'manual'` or `source_type IS NULL` if those represent legacy manual entries.
- For journal entry updates, count only meaningful manual JE updates, not generated/source-backed rows.
- Keep the return signature unchanged so `src/hooks/useEmployeeActivity.ts` and the existing UI do not require a breaking type change.