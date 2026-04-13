

## Fix: Let ALL Company Members Through the Subscription Gate

### Problem
Line 179 of `SubscriptionGate.tsx` only bypasses the gate for users where `isEmployee === true`. This checks the `user_roles` table for the `employee` app_role. But accountants (like Jole) have the `accountant` app_role, not `employee`. Any non-owner company member who isn't mapped to `employee` gets blocked.

### Solution
Replace the `isEmployee` check with a profile-based check: if the user has a `home_builder_id` set in the `users` table, they belong to a company and should inherit that company's access. This covers employees, accountants, construction managers — every role.

### Changes

**File: `src/components/SubscriptionGate.tsx`**
1. Import `useUserProfile` instead of `useUserRole`.
2. Replace `isEmployee` logic with: `const isCompanyMember = !!profile?.home_builder_id`.
3. Bypass the gate when `isCompanyMember` is true.

**Database: Backfill missing `user_roles` rows**
Insert missing role entries for any confirmed users who have no `user_roles` row, to prevent other parts of the app from breaking:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 
  CASE u.role
    WHEN 'owner' THEN 'owner'::app_role
    WHEN 'accountant' THEN 'accountant'::app_role
    ELSE 'employee'::app_role
  END
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL AND u.confirmed = true;
```

### Why This Works
- `home_builder_id` is set for every non-owner company member regardless of their title/role.
- No more dependency on the `user_roles` table for the subscription gate.
- Owners still go through the normal subscription check.
- Future roles added to the company are automatically covered.

