
Problem confirmed:
- LCS Site Services’ cost codes are not just hidden in the UI right now — the current `company_cost_codes` fetch for that company returns an empty array.
- The edit dialog also logged `Setting cost codes: []`, so it is initializing from empty data.
- This is not a general Companies-page failure; the batch company query is still returning cost codes for many other companies.

Why this is still happening:
1. `EditCompanyDialog` still uses the same React Query key as the view modal: `['company-cost-codes', companyId]`.
2. Those two places return different shapes:
   - edit dialog: array of `cost_code_id` strings
   - modal: array of full `cost_codes` objects
3. The save path is still destructive: it deletes all `company_cost_codes` rows first, then reinserts from current state. If current state is bad/empty, the associations are wiped.

Implementation plan:
1. Isolate the edit query cache
   - Change `EditCompanyDialog` to use a dedicated key like `['edit-company-cost-codes', companyId]`.
   - Keep the modal/view query keys separate.
   - Normalize fetched values before storing them in `selectedCostCodes` so only UUID strings are ever saved.

2. Make cost-code saving non-destructive
   - Capture the original loaded cost-code IDs when the dialog opens.
   - On save, compute:
     - added IDs
     - removed IDs
   - Insert only additions and delete only explicit removals.
   - Remove the current “delete all then insert all” pattern.

3. Add stronger safety guards
   - Block submit until the edit-specific cost-code query has fully loaded.
   - Abort save if loaded data is invalid or does not match the expected UUID list shape.
   - If the dialog opens in a suspicious empty state, show a warning instead of allowing a destructive save.

4. Restore the missing LCS associations
   - After the code fix, restore LCS Site Services’ missing associated cost codes from the best source of truth:
     - backup / prior DB state if available, or
     - reconstruct from existing project usage history and recent vendor activity, then confirm before saving.
   - Apply the same recovery to any other impacted subs.

5. Verify end to end
   - Open LCS Site Services and confirm:
     - Companies table count
     - edit dialog chips
     - cost-code modal list
     all match.
   - Save without changing cost codes and confirm nothing disappears.
   - Add/remove one cost code and confirm only that one change is applied.
   - Repeat on at least one other subcontractor and one vendor.

Files to update:
- `src/components/companies/EditCompanyDialog.tsx`
- `src/components/companies/CompanyCostCodesModal.tsx`
- optionally `src/components/companies/CompaniesTable.tsx` for mismatch warning support

Technical details:
- Current regression: shared query key with mismatched data shapes.
- Current risk: destructive `delete().eq('company_id', company.id)` save strategy.
- The previous fix reduced one loading race, but it did not eliminate the shared-cache bug or the destructive mutation path, which is why this can still happen.
