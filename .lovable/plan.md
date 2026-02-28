

# Data Fixes for Doreen Gray Homes

Two database data changes are needed (no code/schema changes):

## 1. Update Retained Earnings account code

The account for Doreen Gray Homes (id: `826e577b-7dbe-4021-b88f-7d61a805140d`) currently has code `32000`. It needs to be updated to `3200`.

**Action**: Update via a temporary edge function using service role key:
```sql
UPDATE accounts SET code = '3200' WHERE id = '826e577b-7dbe-4021-b88f-7d61a805140d';
```

## 2. Reset onboarding Step 5 (Import Chart of Accounts)

The onboarding_progress record for Doreen Gray Homes (home_builder_id: `3e482bbc-139c-4ebc-a006-d9290287d2d5`) has `chart_of_accounts_imported = true`. It needs to be set back to `false` so the import step can be retested.

**Action**: Update via the same temporary edge function:
```sql
UPDATE onboarding_progress SET chart_of_accounts_imported = false WHERE home_builder_id = '3e482bbc-139c-4ebc-a006-d9290287d2d5';
```

## Implementation

Create a temporary edge function `admin-data-fix` that uses the service role key to execute both updates, call it once to apply the fixes, then delete the function afterward.

