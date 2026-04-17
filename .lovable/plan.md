
## Problem
Apartment data (inputs) is leaking across projects — opening 1020 Princess Street shows Knob Hill's numbers. Apartment data must be project-scoped, just like Accounting, Schedule, POs, etc.

## Root Cause Investigation Needed
`useApartmentInputs.ts` queries `apartment_inputs` filtered by `project_id` and creates a row with `project_id` if none exists. That looks correct on the surface. The bug is likely one of:
1. **Missing/wrong unique constraint** — multiple rows exist for `(project_id)`, and `.maybeSingle()` returns whichever Postgres orders first (often the same one). Or `.maybeSingle()` errors silently when >1 row exists.
2. **RLS too permissive on `project_id`** — pulling rows from other projects within the same `home_builder_id`. Still, the `.eq('project_id', projectId)` should constrain it… unless the original row was created without a `project_id` (NULL) and is being matched by the owner-only RLS path somewhere.
3. **React Query cache key issue** — query key is `["apartment-inputs", projectId]` which looks fine, but if there's stale cross-project hydration somewhere it could carry over. Less likely since the data clearly persists in DB.

Most likely #1 — when LTC and target_cap_rate were added, or earlier, an extra row got created and now the query returns a row from a different project.

## Plan
1. Inspect DB directly: `SELECT id, project_id, owner_id FROM apartment_inputs ORDER BY created_at;` to confirm whether 1020 Princess has its own row, and whether duplicates exist.
2. Check for a unique constraint on `apartment_inputs.project_id`. If missing, add one.
3. Audit `useApartmentInputs.ts` query: confirm `.eq('project_id', projectId)` is the only filter and no fallback to "first row for owner".
4. Fix data:
   - If 1020 Princess has no row → the hook will auto-create one (current logic). Verify it does.
   - If duplicate/wrong rows exist → migration to dedupe and enforce unique constraint on `project_id`.
5. Same audit for `apartment_operating_expenses` (or whatever table powers the dynamic op-ex list per the apartment memory) to make sure it's also project-scoped.

## Files
- `src/hooks/useApartmentInputs.ts` (verify, likely no change)
- New migration: `ALTER TABLE apartment_inputs ADD CONSTRAINT apartment_inputs_project_id_key UNIQUE (project_id);` (after deduping)
- Possibly any other apartment-scoped tables (operating expenses) — verify and patch similarly.

## Out of Scope
No UI changes. No calculation changes. Pure data-isolation fix.
