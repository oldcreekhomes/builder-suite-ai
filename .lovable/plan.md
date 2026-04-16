

## Plan: Lock description + add Unit dropdown on Manual sub-lines

### Issue 1 — Description should be read-only
The Description field on each Manual sub-line currently renders as an editable `<Input>` pre-filled with the cost code name. Replace it with a static, non-editable text cell that shows the cost code name (same value, just not editable). Drop the per-line `description` from editable state; continue persisting `description = costCodeName` on save so existing rows stay consistent.

### Issue 2 — Unit becomes a dropdown matching Estimating
The Estimating screen uses a fixed `unit_of_measure` Select with these options (see `src/components/EditCostCodeDialog.tsx`):
- Each
- Square Feet
- Linear Feet
- Square Yard
- Cubic Yard

I will:
- Confirm the Estimate tab in `BudgetDetailsModal.tsx` uses the same option list (and reuse it as a single shared constant).
- Replace the current Unit cell on the Manual tab (currently empty/text) with a `<Select>` using the **same option list, sorted alphabetically**:
  - Cubic Yard
  - Each
  - Linear Feet
  - Square Feet
  - Square Yard
- Persist the selected value into `project_budget_manual_lines.unit_of_measure`.

### Storage
Add a `unit_of_measure text null` column to `project_budget_manual_lines` (new table from previous step, safe additive change). No data migration needed.

### Files to change
- `src/components/budget/BudgetDetailsModal.tsx` — make Description read-only text; add Unit `<Select>` per sub-line; include `unit_of_measure` in state, hydration, and save payload.
- New migration — `ALTER TABLE project_budget_manual_lines ADD COLUMN unit_of_measure text;`
- `src/integrations/supabase/types.ts` — auto-regenerated.

### Out of scope
- No changes to other tabs (Estimate, PO, Vendor Bid, Historical, Actual).
- No changes to lot allocation math, Job Costs sync, or Apply behavior.

### Validation
1. Open Manual tab → Description shows cost code name as plain text, not editable.
2. Unit column shows a dropdown with the 5 options in alphabetical order.
3. Select a unit, click Apply, reopen → unit persists per row.
4. Add Row → new sub-line also has read-only description and Unit dropdown.

