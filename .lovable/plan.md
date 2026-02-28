

# Complete Deletion of Dorian Gray Homes Test Account

## Summary
Delete all data associated with the test account "Doreen Gray Homes" (owner ID: `3e482bbc-139c-4ebc-a006-d9290287d2d5`, email: `buildersuiteai1@gmail.com`) from both the database and auth system.

## Data to Delete

| Table | Records | Notes |
|-------|---------|-------|
| cost_code_price_history | 227 | owner_id match |
| cost_codes | 302 | owner_id match |
| accounts | 14 | owner_id match |
| company_representatives | 1 | home_builder_id match |
| companies | 1 | home_builder_id match |
| projects | 1 | owner_id match (id: 0c8bdbcf...) |
| onboarding_progress | 1 | home_builder_id match |
| user_roles | 1 | user_id match |
| users (public) | 1 | The owner record |
| auth.users | 1 | The auth account |

No bills, journal entries, checks, deposits, credit cards, or employee users exist for this account.

## Approach
Create a temporary edge function using the service role key to delete all data in the correct order (child tables first to respect foreign key constraints), then delete the auth user. After successful execution, the function will be removed.

## Deletion Order
1. `cost_code_price_history` (references cost_codes)
2. `cost_codes` (owner_id)
3. `company_representatives` (home_builder_id, references companies)
4. `companies` (home_builder_id)
5. `accounts` (owner_id)
6. `projects` (owner_id)
7. `onboarding_progress` (home_builder_id)
8. `user_roles` (user_id)
9. `users` (public table, id)
10. `auth.users` (via admin API - removes the authentication account entirely)

After this, the account will no longer exist anywhere in the system.

