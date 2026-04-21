

## Plan: Fix bills appearing on every project (cross-project leak in "Enter with AI")

### Root cause

The `pending_bill_uploads` table has **no `project_id` column**. When a user uploads a PDF on Oceanwatch, it lands in a global pool. The "Enter with AI" tab (`usePendingBills` → `BillsReviewTable` / `BatchBillReviewTable`) queries the entire pool with no project filter, so:

- **Same tenant, every project shows the same pending bills.** Open Manage Bills under Oceanwatch → see 2 bills. Open Manage Bills under any other Old Creek project → see the same 2 bills. They aren't "on Oceanwatch" — they're floating, awaiting approval, and currently visible everywhere.

This is NOT a tenant leak (both bills belong to Old Creek). It's a project-scoping bug. Same class of bug as last week's cost codes issue: a missing `WHERE` clause that worked by accident when only one project was active.

Confirmed in DB:
- 2 pending uploads exist, both `owner_id = 2653aba8…` (Old Creek)
- `pending_bill_uploads` has no `project_id` column
- All `pending_bill_lines.project_id` for these uploads are `NULL` (project gets set later, at approval)

### The fix — three parts

**Part 1: Add `project_id` to `pending_bill_uploads` (migration)**

```sql
ALTER TABLE pending_bill_uploads
  ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX idx_pending_bill_uploads_project_id
  ON pending_bill_uploads(project_id);
```

This stamps each upload with the project it was initiated from. Existing rows get `NULL` (we'll handle them in Part 3).

**Part 2: Stamp uploads with the current project + scope the queries**

- `SimplifiedAIBillExtraction.tsx` (line 228-ish, where `pending_bill_uploads` is inserted): include the active `projectId` in the insert payload.
- `usePendingBills.ts`: accept an optional `projectId` argument and add `.eq('project_id', projectId)` (and always `.eq('owner_id', ownerId)` as a tenant safety net mirroring the cost-codes fix).
- `BillsApprovalTabs.tsx`: pass `effectiveProjectId` into `usePendingBills(effectiveProjectId)`.
- `useBillCounts.ts` (the "Enter with AI (N)" tab badge): same project filter.
- `OwnerDashboardSummary.tsx` and any other caller: audit and apply the same filter (or scope to the current project context as appropriate).

**Part 3: Backfill / triage existing orphan rows**

The 2 pending uploads currently in the system have no `project_id`. Two options, presented to the user before the migration runs:

1. Assign them to a specific project now (most likely the project they were originally uploaded under — which the user can confirm), OR
2. Leave them visible only in a new "Unassigned" view accessible from the company dashboard.

I recommend option 1 with a one-time SQL update once the user tells me which project each belongs to (Nob Hill invoice → Nob Hill project; the C26019 invoice → its true project). That keeps the UI clean.

### Why this matches the cost-codes pattern

Same root pathology: a query that returns more rows than it should because a scoping `WHERE` clause was never added. Fix layers exactly like before — schema constraint + app-level filter + audit of all callers.

### Verification after deploy

1. Upload a bill under Project A → appears only in Project A's "Enter with AI" tab.
2. Open Project B's Manage Bills → "Enter with AI" tab is empty (or shows only B's bills).
3. The "Enter with AI (N)" badge on each project shows that project's count, not the global count.
4. Approval flow still works (project at approval time is independent and can override if needed).

### Files changed

1. New migration — add `project_id` column + index on `pending_bill_uploads`
2. `src/components/bills/SimplifiedAIBillExtraction.tsx` — include `project_id` on insert
3. `src/hooks/usePendingBills.ts` — accept and apply `projectId` filter + `owner_id` filter
4. `src/components/bills/BillsApprovalTabs.tsx` — pass `effectiveProjectId` into the hook
5. `src/hooks/useBillCounts.ts` — apply project filter to the AI-extract count
6. `src/components/owner-dashboard/OwnerDashboardSummary.tsx` — audit/scope appropriately
7. One-time data triage for the 2 existing orphan uploads (after you confirm their projects)

### Why this is safe

- New column defaults to `NULL`; no existing rows break.
- All filter changes are restrictive (add `WHERE`); no row that should be visible disappears unintentionally.
- Approval flow is untouched — `approve_pending_bill(project_id_param)` still controls what project the final bill lands on.
- No data is deleted.

### Question before implementing

For the 2 existing pending uploads — which project should each be assigned to?
- `Invoice # C26019.PDF` (An Exterior, Inc., $27,180) → ?
- `Recreate Inv_Nob Hill_0025952.pdf` (LCS Site Services, $30,264.52) → likely Nob Hill, please confirm.

