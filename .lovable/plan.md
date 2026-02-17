

## Fix: Exclude Current Bill from Summary "Billed to Date"

### Problem
The PO Summary dialog uses the `useBillPOMatching` hook to calculate "Billed to Date". This hook counts ALL posted/paid bills -- including the bill you're currently looking at. So the $720 shows up in both "Billed to Date" and "This Bill", making Remaining show -$720.

The PO Detail view works correctly because it uses a different hook (`useVendorPurchaseOrders`) that already has the `excludeBillId` fix.

### Fix (single file: `src/hooks/useBillPOMatching.ts`)

**Add `bill_id` to the query select and exclude current bills from the totals.**

The query at ~line 138-168 fetches bill_lines linked to the matched POs to build `billedLookup`. Currently it does not select `bill_id`, so there's no way to filter out the current bill. The fix:

1. Add `bill_id` to the select clause (line 140)
2. Create a set of bill IDs from the input bills array
3. Skip any bill_lines belonging to those bills when building the `billedLookup` totals

```typescript
// Add bill_id to select
.select(`
  bill_id,
  purchase_order_id,
  amount,
  ...
`)

// Skip lines from the current bills
const billIdsToExclude = new Set(bills.map(b => b.id));

(linkedLines || []).forEach(line => {
  if (billIdsToExclude.has(line.bill_id)) return; // exclude current bills
  // ... rest of existing logic
});
```

### Why This Is Safe
- This only affects the summary table's "Billed to Date" column
- Each bill's own amount still appears in "This Bill" (computed separately in `BillPOSummaryDialog`)
- The "Remaining" column will now correctly show: PO Amount - (historical billed) - (this bill)
- No other callers or tabs are affected

### Files Changed
- `src/hooks/useBillPOMatching.ts` (add `bill_id` to select, exclude current bills from totals)

