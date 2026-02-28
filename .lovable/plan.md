

# Delete Erica Gray Homes Account Completely

## What needs to be deleted

The account `buildersuiteai1@gmail.com` (ID: `bfdbd789-0cd2-4b79-bc5f-51d28e2a3bc4`) labeled "Erica Gray Homes" has:
- 1 row in `public.users`
- 1 row in `user_roles`
- 1 entry in `auth.users`
- No employees, projects, companies, cost codes, accounts, bills, or journal entries (clean account)

## Implementation

1. Create a temporary edge function `admin-delete-user` that uses the service role key to:
   - Delete from `user_roles` where `user_id` matches
   - Delete from `public.users` where `id` matches
   - Delete from `auth.users` using `supabaseAdmin.auth.admin.deleteUser()`

2. Deploy and invoke the function with userId `bfdbd789-0cd2-4b79-bc5f-51d28e2a3bc4`

3. Verify deletion by querying the database to confirm the user no longer exists

4. Remove the temporary edge function after successful deletion

This is necessary because the existing `delete-employee` function explicitly blocks deletion of owner accounts, and the database tools only support SELECT queries.
