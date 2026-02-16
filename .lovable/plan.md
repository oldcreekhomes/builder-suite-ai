

## Fix: "Add Your Companies" Dialog Showing for Employees

### Problem
The "Add Your Companies" template dialog appears for employees (like Raymond Zins) even though Old Creek Homes already has companies. This happens because the company count query in `CompaniesTab.tsx` uses `user.id` directly as the `home_builder_id` filter. For employees, `user.id` is the employee's own ID -- not the owner's -- so the query returns 0 companies, triggering the dialog.

### Root Cause
Line 28 in `CompaniesTab.tsx`:
```
.eq("home_builder_id", user.id)
```
Should resolve to the owner's ID for employees, just like `useOnboardingProgress.ts` does with `effectiveOwnerId`.

### Fix
**File: `src/components/settings/CompaniesTab.tsx`**

1. Add a query to fetch the current user's profile (role and home_builder_id)
2. Resolve an `effectiveOwnerId`: if the user is an owner, use their own ID; if an employee, use their `home_builder_id`
3. Use `effectiveOwnerId` in the company count query instead of `user.id`

This follows the exact same pattern already established in `useOnboardingProgress.ts` (lines 33-47) and ensures the template dialog only appears when the company truly has zero companies.

### Technical Details

```
// Add user profile query to resolve effective owner
const { data: userProfile } = useQuery({
  queryKey: ["companies-tab-user-profile", user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("users")
      .select("id, role, home_builder_id")
      .eq("id", user.id)
      .single();
    return data;
  },
  enabled: !!user?.id,
  staleTime: 5 * 60 * 1000,
});

const effectiveOwnerId = userProfile?.role === 'owner'
  ? user?.id
  : userProfile?.home_builder_id ?? user?.id;

// Then use effectiveOwnerId in the count query
.eq("home_builder_id", effectiveOwnerId)
```

No other files need changes. The CompaniesTable component likely already handles this correctly since it shows companies in the background.

