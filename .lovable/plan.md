
## Plan: Persist Manual allocation mode exactly as saved

The real issue is that the Manual dialog is still reopening from inferred math instead of a saved user choice. Right now the selected mode is not explicitly stored, and `BudgetDetailsModal.tsx` can also lock onto stale sibling-row data because its hydration guard uses a static “resolved” key.

### What to change

1. **Persist the Manual allocation choice**
- Add a nullable `manual_allocation_mode` column to `project_budgets` with allowed values `full` / `per-lot`.
- When the user clicks **Apply** in the Manual tab, save the chosen mode.
- For multi-lot manual budgets, write that mode to all sibling `project_budgets` rows for the same project + cost code so reopening any lot row uses the same saved choice.

2. **Make reopen use the saved mode first**
- In `src/components/budget/BudgetDetailsModal.tsx`, change manual hydration so:
  - `manual_allocation_mode` is the primary source of truth
  - current sibling-row math inference is only a fallback for older records that do not have a saved mode yet
- Keep the existing total-reconstruction logic for legacy/manual line amounts, but do not let it override an explicitly saved choice.

3. **Fix stale reopen behavior**
- After a Manual save, also invalidate:
  - `['budget-siblings-manual', projectId, costCode.id]`
  - `['budget-manual-lines', projectId, costCode.id]`
  - plus the existing `['project-budgets', projectId]` and `['job-costs']`
- Update/remove the current hydration dedupe so it reacts to the newly saved mode instead of only `budgetItem.id:resolved`.

4. **Keep backward compatibility**
- Existing manual budgets with no saved `manual_allocation_mode` will still use the current split-pattern inference.
- As soon as the user saves once, the mode becomes explicit and future opens will match exactly what they last saved.

### Files
- `supabase/migrations/...sql` — add `manual_allocation_mode` to `project_budgets`
- `src/integrations/supabase/types.ts` — regenerate/update types for the new column
- `src/components/budget/BudgetDetailsModal.tsx` — persist mode, hydrate from saved mode, fix invalidation/hydration guard
- `src/hooks/useBudgetSourceUpdate.ts` — extend manual updates to carry the saved mode where that helper is used

### Out of scope
- No UI redesign
- No change to PO/Vendor Bid allocation behavior
- No change to lot math beyond making reopen honor the saved Manual choice

### Validation
1. Save Manual as **Divide by 19 lots** → close → reopen → it opens as **Divide by 19 lots**.
2. Save Manual as **Full amount** → close → reopen → it opens as **Full amount**.
3. Toggle/save multiple times → the last saved mode always wins.
4. Reopen immediately after saving without a hard refresh → correct mode still loads.
5. Older manual rows without the new field still open sensibly until re-saved.
