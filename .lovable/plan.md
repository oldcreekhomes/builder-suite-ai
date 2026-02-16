

## Fix: Employee Invitation Failing Due to Database Constraint

### Root Cause

The `send-employee-invitation` edge function creates an auth user with `user_type: "employee"` in metadata. The `handle_new_user()` database trigger then inserts that value into `public.users.user_type`. However, the `users_user_type_check` constraint only allows two values:

```
CHECK (user_type IN ('home_builder', 'marketplace_vendor'))
```

Since `'employee'` is not in that list, the INSERT fails, which causes the entire `auth.admin.createUser()` call to fail with "Database error creating new user".

### Fix

**Single database migration** to update the check constraint:

```sql
ALTER TABLE public.users DROP CONSTRAINT users_user_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_user_type_check 
  CHECK (user_type = ANY (ARRAY['home_builder', 'marketplace_vendor', 'employee']));
```

No code changes needed -- the edge function and trigger are correct. The constraint just needs to accept `'employee'` as a valid value.

### Technical Details

- **Error location**: `handle_new_user()` trigger on `auth.users` INSERT, which inserts into `public.users`
- **Constraint**: `users_user_type_check` on `public.users.user_type`
- **Current allowed values**: `home_builder`, `marketplace_vendor`
- **Required allowed values**: `home_builder`, `marketplace_vendor`, `employee`

