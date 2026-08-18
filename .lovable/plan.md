# Hide revoked employees from the Employee Activity card

## Problem
The Employee Activity card on the Owner Dashboard lists everyone who has ever been on the team, including people whose access was revoked or who are pending removal (for example Kyleen Urtola). It should show active employees only.

## Change
Filter the activity list to active team members: exclude anyone whose access has been revoked and anyone flagged as pending removal. Their past actions simply no longer appear as a row.

## Technical notes
- Update the `get_employee_activity_summary` database function: in its `tenant_users` CTE, add `AND COALESCE(u.access_revoked, false) = false AND u.pending_removal_at IS NULL` alongside the existing tenant scope.
- No frontend changes needed; `useEmployeeActivity` / `EmployeeActivitySection` render whatever the function returns.
- Same filter convention already used for chat and team pickers in `useCompanyUsers`.
