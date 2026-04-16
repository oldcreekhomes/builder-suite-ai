

## Plan: Lock description + Unit dropdown on Manual sub-lines

### 1. Description — read-only
Replace the editable `<Input>` for Description on each Manual sub-line with plain text showing the cost code name. Remove `description` from per-line editable state. On save, continue writing `description = costCodeName` so existing data stays consistent.

### 2. Unit — dropdown matching Estimating
Use the same 5-option list as `EditCostCodeDialog.tsx`, sorted alphabetically:
- Cubic Yard
- Each
- Linear Feet
- Square Feet
- Square Yard

Render a shadcn `<Select>` in the Unit cell of every Manual sub-line. Extract the option list to a single shared constant so Estimate and Manual stay in sync.

### 3. Storage
Additive migration:
```sql
ALTER TABLE public.project_budget_manual_lines
  ADD COLUMN unit_of_measure text;
```
No backfill needed. Hydration reads the column; save writes it.

### Files
- `src/components/budget/BudgetDetailsModal.tsx` — read-only description cell, Unit `<Select>`, `unit_of_measure` in state + hydration + save payload.
- New migration — add `unit_of_measure` column.
- `src/integrations/supabase/types.ts` — auto-regenerated.

### Out of scope
Other tabs, lot allocation math, Job Costs sync, Apply behavior.

### Validation
1. Manual tab: Description renders as plain text, not editable.
2. Unit column shows dropdown with 5 options in alphabetical order.
3. Select unit → Apply → reopen → value persists per row.
4. Add Row → new sub-line has read-only description and Unit dropdown.

