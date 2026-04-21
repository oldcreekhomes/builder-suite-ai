

## Plan: Triage 2 orphan bills + implement project-scoping fix

### Step 1 — Assign the 2 orphan pending uploads (data update)

```sql
-- Nob Hill invoice → Nob Hill project
UPDATE pending_bill_uploads
SET project_id = '691271e6-e46f-4745-8efb-200500e819f0'
WHERE id = 'ee249b70-f247-4d98-b96e-fcb95afe59ae';

-- C26019 → 923 17th Street project (lookup project_id by address first)
UPDATE pending_bill_uploads
SET project_id = (SELECT id FROM projects WHERE address ILIKE '923 17th%' LIMIT 1)
WHERE id = <C26019 upload id>;
```

### Step 2 — Stamp new uploads with the active project

`src/components/bills/SimplifiedAIBillExtraction.tsx`: include `project_id: projectId` in the `pending_bill_uploads` insert payload.

### Step 3 — Filter all "Enter with AI" queries by project

- `src/hooks/usePendingBills.ts` — accept `projectId?: string`, add `.eq('owner_id', ownerId)` (tenant safety net via `get_current_user_home_builder_info`) and `.eq('project_id', projectId)` when provided.
- `src/components/bills/BillsApprovalTabs.tsx` — pass `effectiveProjectId` into `usePendingBills(effectiveProjectId)`.
- `src/hooks/useBillCounts.ts` — add `.eq('project_id', projectId)` to the `pending_bill_uploads` count query so the "Enter with AI (N)" badge is per-project.
- `src/components/owner-dashboard/OwnerDashboardSummary.tsx` — audit; scope or aggregate appropriately.

### Step 4 — Verify

1. 923 17th Street → "Enter with AI" shows C26019 only.
2. Nob Hill → shows the LCS invoice only.
3. Oceanwatch → empty.
4. Upload a new bill on any project → appears only in that project.
5. Tab badge counts are per-project, not global.

### Why this is safe

- Schema column already added (prior migration). Existing rows default to NULL; nothing breaks.
- All filter changes are restrictive — they can only hide other projects' rows, never break your own.
- `approve_pending_bill` still controls final project assignment at approval time; unchanged.
- No data deleted.

