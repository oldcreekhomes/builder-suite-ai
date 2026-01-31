

## Root Cause

The query error is:
```
PGRST200: Could not find a relationship between 'project_purchase_orders' and 'cost_codes' in the schema cache
```

The `project_purchase_orders` table has a `cost_code_id` column, but **no foreign key constraint** to the `cost_codes` table. PostgREST requires a defined foreign key relationship to use embedded joins like `cost_codes (id, code, name)`.

---

## Fix

Change `useVendorPurchaseOrders.ts` to fetch cost codes separately instead of using an embedded join.

### Current (broken):
```typescript
const { data: pos, error: poError } = await supabase
  .from('project_purchase_orders')
  .select(`
    id,
    po_number,
    total_amount,
    cost_code_id,
    cost_codes (id, code, name)  // <-- fails, no FK relationship
  `)
```

### Fixed approach:
1. Fetch POs without the embedded join (remove `cost_codes (id, code, name)`)
2. Collect all unique `cost_code_id` values from POs
3. Fetch those cost codes in a separate query
4. Merge the cost code data when building the result

---

## Implementation

```text
src/hooks/useVendorPurchaseOrders.ts
```

1. Remove `cost_codes (id, code, name)` from the initial PO query
2. After fetching POs, extract unique `cost_code_id` values
3. Fetch cost codes separately:
   ```typescript
   const { data: costCodes } = await supabase
     .from('cost_codes')
     .select('id, code, name')
     .in('id', costCodeIds);
   ```
4. Build a lookup map: `Map<string, { id, code, name }>`
5. When building results, look up cost code from the map instead of expecting it from the embedded join

---

## Expected result

After this fix:
- Selecting **Carter Lumber** or **ABC Supply** will show the "Checking purchase orders..." loading state
- Then display the list of approved POs with their cost codes and remaining balances
- No more "Couldn't load purchase orders" error

---

## Files to modify

- `src/hooks/useVendorPurchaseOrders.ts`

