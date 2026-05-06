# Owner Dashboard – Active Jobs table tweaks

Scope is limited to `src/components/owner-dashboard/ActiveJobsTable.tsx` and `src/hooks/useProjects.tsx`.

## Changes

1. **Address column shows street only**
   - Display `project.address.split(',')[0].trim()` instead of the full address. Falls back to "No address" if empty.

2. **Add "Manager" column** (between Status and Schedule Progress)
   - Source: `projects.construction_manager` (UUID → users table).
   - Extend `useProjects` to also fetch first/last name for `construction_manager` IDs (same pattern already used for `accounting_manager`), exposing `construction_manager_user: { first_name, last_name } | null` on the `Project` type.
   - Render `${first_name} ${last_name}`.trim() or `-` when unset.
   - Update colSpan for the empty state row.

3. **Remove the "Next Milestone" column**
   - Delete the `<TableHead>Next Milestone</TableHead>` and the matching `<TableCell>{progress?.nextMilestone || "-"}</TableCell>`.

## Out of scope
No changes to filtering, sorting, drag/reorder, schedule progress, or other dashboards.
