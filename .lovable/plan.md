## Problem

The Owner Dashboard's Employee Activity section shows "No employees found" because the `get_employee_activity_summary` RPC errors with:

```
column pf.created_at does not exist
hint: Perhaps you meant to reference the column "pf.created_by"
```

The `project_files` table uses `uploaded_at` (not `created_at`) for the timestamp. The frontend treats the failed RPC as empty data.

## Fix

Create a migration that replaces `get_employee_activity_summary` with a corrected version where the `project_files` branch uses `pf.uploaded_at` and `pf.uploaded_by` (since `created_by` exists but `uploaded_by` is the historical attribution column for files):

```sql
SELECT pf.uploaded_by, pf.uploaded_at, 'file'
FROM public.project_files pf
WHERE pf.uploaded_at BETWEEN start_date AND end_date
  AND COALESCE(pf.is_deleted, false) = false
```

All other branches remain unchanged.

## Verification

After migration, reload the Owner Dashboard — the Employee Activity table should list the 6 Old Creek Homes employees with their counts and last action timestamps.
