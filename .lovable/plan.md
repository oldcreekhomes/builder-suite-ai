

## Fix: Edit Company Dialog Wipes Cost Codes on Save

### Root Cause
The Edit Company dialog has a race condition that silently deletes all cost code associations when saving:

1. Dialog opens → `selectedCostCodes` is initialized to `[]`
2. `companyCostCodes` query starts fetching from DB
3. **If the user saves before the query completes**, or if the initialization effect doesn't trigger (e.g., cost codes load but `selectedCostCodes.length` is already > 0 from a previous open), `selectedCostCodes` remains `[]`
4. The save mutation calls `delete().eq('company_id', ...)` then inserts **nothing** — wiping all associations

The initialization guard on line 293 (`selectedCostCodes.length === 0`) also prevents re-initialization if the dialog is reopened for a different company without fully resetting.

### Fix — Two Changes in `src/components/companies/EditCompanyDialog.tsx`

**1. Track whether cost codes have been initialized separately**

Add a `costCodesInitialized` ref (similar to the existing `initializationDone` ref) so we don't rely on the fragile `selectedCostCodes.length === 0` check:

```ts
const costCodesInitialized = useRef(false);
```

Reset it when dialog closes (alongside `initializationDone.current = false`).

Update the initialization effect:
```ts
useEffect(() => {
  if (open && companyCostCodes.length >= 0 && !costCodesInitialized.current && companyCostCodes !== undefined) {
    setSelectedCostCodes([...companyCostCodes]);
    costCodesInitialized.current = true;
  }
}, [open, companyCostCodes]);
```

**2. Block save while cost codes are still loading**

Disable the save button until the `companyCostCodes` query has resolved, so the user can never accidentally submit with an empty array before data loads. Add `isFetching` from the query and pass it to the submit button's `disabled` prop.

### Files Changed
- `src/components/companies/EditCompanyDialog.tsx` — initialization logic fix + save button guard

### Result
- Cost codes will no longer be wiped when editing a company
- Existing companies that already lost their cost codes will need to be re-associated manually (or via a DB restore if you have the data)

