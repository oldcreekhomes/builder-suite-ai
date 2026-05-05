I found the current blocker: the employee activity RPC is still returning HTTP 400. The error is no longer the `project_files.created_at` issue; it is now:

```text
column reference "start_date" is ambiguous
```

This happens because the PL/pgSQL function parameters are named `start_date` / `end_date`, and `project_schedule_tasks` also has columns named `start_date` / `end_date`. PostgreSQL cannot tell which one the function means in the `BETWEEN start_date AND end_date` filters.

I also verified that the tenant/user data is present. For the logged-in Old Creek Homes owner, the underlying activity query should return 7 rows, including Erica, Raymond, Jole Ann, Lex, Matt, Danny, and Steven, with recent activity counts.

Plan:

1. Create a database migration replacing `public.get_employee_activity_summary`
   - Rename the function parameters to unambiguous names, e.g. `p_start_date` and `p_end_date`.
   - Update every date filter to use `p_start_date` / `p_end_date`.
   - Keep the prior `project_files` fix using `uploaded_by` and `uploaded_at`.
   - Keep the existing permission check: only users with `user_notification_preferences.can_access_employees = true` can call it.
   - Keep tenant isolation through `get_caller_tenant_id()` and the `tenant_users` join.

2. Tighten tenant filtering for non-owner-scoped tables where needed
   - `project_purchase_orders`, `project_bids`, `project_budgets`, `project_schedule_tasks`, and `project_files` are currently filtered by actor only after the union.
   - I will preserve the tenant-user actor filter, and if the table has `project_id`, also join/filter through `projects.owner_id = caller_tenant` where safe. This prevents unrelated rows created by the same user in another tenant context from leaking into counts.

3. Improve the UI error state
   - Update `EmployeeActivitySection` to read the query `error` from `useEmployeeActivity`.
   - Instead of silently falling through to “No employees found” when the RPC fails, show a small destructive/error message like “Unable to load employee activity.”
   - Add a concise console error in the hook/component so future RPC issues are visible during debugging.

4. Verify after migration
   - Re-run the RPC path through the app/session.
   - Confirm the Owner Dashboard shows the Old Creek Homes employees instead of “No employees found.”
   - Confirm the counts match the expected recent activity rows and the section remains hidden for users without employee access.