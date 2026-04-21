
## Restore employee access to Old Creek cost codes in bill entry

### Problem
In Manage Bills → Enter Manually → Job Cost, confirmed Old Creek employees must be able to see Old Creek’s company cost codes. They should not see other builders’ cost codes, and other builders’ employees should only see their own builder’s cost codes.

The current cost-code loading path is too brittle because parts of the app decide the active company owner using role-specific logic. If that logic resolves an employee/accountant to their own user id instead of Old Creek’s owner id, the query becomes:

```text
cost_codes.owner_id = employee_user_id
```

instead of:

```text
cost_codes.owner_id = Old Creek owner_id
```

That returns zero cost codes even though Old Creek has the codes.

### Fix
Make company cost-code access tenant-based, not role-label-based:

```text
If user is confirmed and has home_builder_id:
  use home_builder_id as the cost-code owner
Else:
  use the logged-in user's id
```

That means all confirmed Old Creek company members resolve to Old Creek’s owner id and see Old Creek cost codes.

### Changes

1. **Fix the database owner-resolution functions**
   - Update `public.get_current_user_home_builder_id()` so it returns `home_builder_id` for any confirmed company member with a `home_builder_id`, not only users whose `role = 'employee'`.
   - Update `public.get_current_user_home_builder_info()` so `is_employee`/company-member logic is true whenever:
     ```sql
     confirmed = true
     AND home_builder_id IS NOT NULL
     ```
   - This keeps the existing RPC shape so current frontend calls do not break.

2. **Normalize cost code RLS**
   - Replace the current `cost_codes` policy with a clear tenant policy:
     ```text
     owner_id = auth.uid()
     OR owner_id = public.get_current_user_home_builder_id()
     ```
   - This preserves tenant isolation:
     - Old Creek employees see Old Creek cost codes.
     - Other builders’ employees see only their builder’s cost codes.
     - No cross-builder leakage.

3. **Add one shared frontend tenant-owner helper**
   - Add a small shared utility, for example:
     ```ts
     getEffectiveOwnerId()
     ```
   - It will:
     - Get the logged-in user.
     - Call the corrected RPC.
     - Return `home_builder_id` for confirmed company members.
     - Return `user.id` for owners.
   - This avoids repeating the fragile `info?.[0]?.is_employee ? ... : user.id` logic everywhere.

4. **Fix the immediate bill-entry cost-code dropdown**
   - Update `src/hooks/useCostCodeSearch.ts` to use the shared effective owner helper.
   - This is the hook powering the Job Cost cost-code field shown in the screenshot.
   - It will continue to fetch only the active builder’s cost codes and still exclude decimal subcategory codes from the main dropdown as it does today.

5. **Fix bill-save validation**
   - Update `src/components/bills/ManualBillEntry.tsx` so the save-time cost-code validation uses the same effective owner helper.
   - This prevents a second failure where the dropdown may show a valid code but saving rejects it because validation looked under the employee’s own user id.

6. **Update other repeated cost-code owner lookups**
   - Replace the same brittle owner-resolution pattern in related cost-code areas, including:
     - `useCostCodes.tsx`
     - `useCostCodeSubcategories.ts`
     - `useAddBudgetModal.ts`
     - `useBudgetData.ts`
     - `useAddBiddingModal.ts`
     - `CostCodeSelector.tsx`
     - `useSpecifications.ts`
     - `AddTakeoffItemDialog.tsx`
     - `BulkImportDialog.tsx`
     - `Settings.tsx`
   - This prevents the same bug from reappearing in Budget, Bidding, Settings, Specifications, and Takeoff.

### Verification
- Confirm Old Creek owner id has cost codes, including `4630 - Cabinets`.
- Confirm Joel/Old Creek employee resolves to Old Creek’s owner id, not her own user id.
- In Manage Bills → Enter Manually → Job Cost:
  - Clicking into Cost Code shows Old Creek cost codes.
  - Searching `cab` or `4630` shows `4630 - Cabinets`.
  - Saving a bill line with that cost code succeeds.
- Confirm Expense tab is unchanged.
- Confirm another builder’s user cannot see Old Creek cost codes.
