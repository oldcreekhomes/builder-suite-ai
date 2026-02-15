

## Delete Test User: Derrick Russell Homes

### Found
- **User**: Derrick Russell Homes
- **Email**: buildersuiteai1@gmail.com  
- **ID**: `1e4bb07a-58e9-4a63-ba70-da6ed85ad2bb`
- **Role**: owner / home_builder

### Steps

1. **Create a temporary admin edge function** (`admin-delete-user`) that uses the service role key to:
   - Delete the user from `auth.users` via `supabase.auth.admin.deleteUser()`
   - Delete the user from `public.users`
   - Delete their entry from `user_roles`

2. **Deploy and invoke it** with the user ID `1e4bb07a-58e9-4a63-ba70-da6ed85ad2bb`

3. **Delete the temporary edge function** after cleanup is complete (it's a one-time utility)

4. **Verify** the user no longer exists in either table

This is the same admin deletion pattern used in the existing `delete-employee` function, just without the ownership/authorization checks since this is a direct admin cleanup of a test account.

