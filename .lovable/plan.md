

## Fix: Onboarding Checklist Incorrectly Shows "Invite Employees" as Incomplete

### Root Cause
The employee check in `useOnboardingProgress.ts` (line 58) queries:
```sql
SELECT id FROM users WHERE home_builder_id = :userId AND user_type = 'employee'
```

But Old Creek Homes' employees all have `user_type = 'home_builder'` -- the distinction is in the `role` column (`employee`, `accountant`, etc.), not `user_type`. So the query returns 0 results, making the checklist think no employees have been invited.

### Fix
**File: `src/hooks/useOnboardingProgress.ts`** (line 58)

Change the employee count query from filtering on `user_type = 'employee'` to simply counting all users with `home_builder_id = userId`. Any user linked via `home_builder_id` is an invited team member, regardless of their `role` or `user_type`.

```
// Before
.eq("user_type", "employee")

// After — remove the user_type filter entirely
```

This single filter removal fixes the issue for Old Creek Homes and any other company whose employees have `user_type = 'home_builder'`.

### Files Changed
1. `src/hooks/useOnboardingProgress.ts` -- Remove `.eq("user_type", "employee")` from the employees query (1 line)

### Risk
None. The `home_builder_id` filter already scopes the query to the correct company's team members. Removing the `user_type` filter just makes it count all invited users (employees, accountants, etc.) which is the correct behavior.

