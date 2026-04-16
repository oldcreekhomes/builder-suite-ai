
## Plan: Fix "null id" error when adding a 2nd manual sub-line

### Root cause
In `BudgetDetailsModal.tsx` (Apply handler, manual branch ~line 588-609), all manual lines are sent in a single `.upsert(upsertRows)` call. Some rows have `id` (existing) and some don't (new). PostgREST normalizes the column set across the batch — new rows end up sending `id: null`, which violates the NOT NULL constraint on `project_budget_manual_lines.id` (the default `gen_random_uuid()` doesn't apply because the column is explicitly present as null).

### Fix
Split the write into two operations:
1. **Update** existing rows (those with `id`) using `.upsert(updates, { onConflict: 'id' })` — every row in this batch has `id`, so no null.
2. **Insert** new rows (those without `id`) using `.insert(inserts)` — `id` field is omitted entirely, so the DB default `gen_random_uuid()` fires.

Also generate the new UUIDs client-side (via `crypto.randomUUID()`) before insert so we can update `manualLines` state with the new ids and avoid orphaning them on subsequent Applies.

### Files to change
- `src/components/budget/BudgetDetailsModal.tsx` — replace the single mixed `.upsert` with separate update/insert paths.

### Out of scope
- No DB schema changes.
- No change to allocation mode persistence or sibling-row writes (that block stays as-is).

### Validation
1. Open Manual tab on cost code 2310, add a 2nd row, set values, click Apply → saves with no error.
2. Reopen → both rows present.
3. Edit row 1, add row 3, Apply → row 1 updates, row 3 inserts, row 2 unchanged.
4. Delete a row, Apply → removed correctly.
5. Allocation mode (Full / Per-lot) still persists exactly as last saved.
