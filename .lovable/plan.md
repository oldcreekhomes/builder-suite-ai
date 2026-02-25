
## Fix: Estimate field not saving when adding subcategory

### Problem
When adding a subcategory with Estimate set to "Yes", the value is not saved to the database. The `addCostCode` function in `useCostCodes.tsx` builds a payload that maps fields like `hasSpecifications`, `hasBidding`, and `hasSubcategories` but **omits the `estimate` field entirely**. The `cost_codes` table has an `estimate` boolean column that defaults to null/false, so it always shows "No".

### Fix

**File: `src/hooks/useCostCodes.tsx` (line ~115)**

Add the `estimate` field to the payload object:

```typescript
estimate: costCodeData.estimate === 'yes',
```

This maps the `"yes"/"no"` string from the dialog form to the boolean `estimate` column in the database, consistent with how `has_specifications`, `has_bidding`, and `has_subcategories` are already handled.

### Files Changed
| File | Change |
|------|--------|
| `src/hooks/useCostCodes.tsx` | Add `estimate` field to the insert/update payload (1 line) |
