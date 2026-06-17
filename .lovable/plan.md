# Group Accountant Dashboard by status (shared with sidebar)

## Goal
Group the Accountant dashboard's Active Jobs table by project status — In Design, Permitting, Under Construction, Completed, Permanently Closed — using the same labels and colored badge headers as the sidebar Project Selector dropdown. Make the status list a shared source so future edits update both places.

## Shared source of truth

Create `src/constants/projectStatusGroups.ts`:

```ts
export const PROJECT_STATUS_GROUPS = [
  { status: "In Design",          color: "bg-yellow-100 text-yellow-800" },
  { status: "Permitting",         color: "bg-blue-100 text-blue-800" },
  { status: "Under Construction", color: "bg-orange-100 text-orange-800" },
  { status: "Completed",          color: "bg-green-100 text-green-800" },
  { status: "Permanently Closed", color: "bg-gray-100 text-gray-600" },
] as const;
```

Update `src/components/sidebar/ProjectSelector.tsx` to import `PROJECT_STATUS_GROUPS` instead of its local `statusGroups`. No visual change.

## Accountant dashboard changes

File: `src/components/accountant-dashboard/AccountantJobsTable.tsx`

1. Import `PROJECT_STATUS_GROUPS`.
2. Replace the single flat `<TableBody>` mapping with one loop per status group:
   - For each group with at least one project (matching search), render a full-width group header row above its rows:
     ```
     <TableRow className="bg-muted/30 hover:bg-muted/30">
       <TableCell colSpan={ALL_COLUMNS}>
         <span className={`text-xs font-semibold px-2 py-1 rounded ${group.color}`}>
           {group.status}
         </span>
       </TableCell>
     </TableRow>
     ```
   - Then render that group's project rows using the existing row JSX unchanged.
3. Hide "Permanently Closed" for non-owners — reuse the same `isOwner` check used in ProjectSelector (via `useUserRole`). If that's not already imported, add it.
4. Sort within each group: keep the current sort behavior (manager/address asc/desc) applied per-group rather than globally.
5. Reorder mode: keep working — drag/drop continues to operate on the underlying `displayOrder`. We do not allow dragging across status groups (status is the source of truth for the section). If a row is dragged within its group, persist order as before.
6. Totals footer: unchanged — still computed across all visible projects.
7. Search: filter first, then group. Hide group headers whose filtered project list is empty.

## Out of scope
- No changes to column structure, totals, badges, QuickBooks toggle, or the reconciliation/closed-books/invoices interactions added previously.
- No DB or hook changes.
- Owner dashboard's `ActiveJobsTable` is not retouched in this pass (can adopt the shared constant later if desired).
