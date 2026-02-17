
## Fix: Exclude Draft Bills from "Billed to Date" in PO Details

### Problem
The `useVendorPurchaseOrders` hook fetches ALL `bill_lines` to calculate "Billed to Date" without filtering by bill status. Draft bills (those sitting on the Review tab) already have rows in `bill_lines`, so the $720 gets counted in "Billed to Date" AND shown in "This Bill" -- double-counting.

The other two POs work fine because they have no draft bills linked to them.

### Fix (single file: `src/hooks/useVendorPurchaseOrders.ts`)

**Change 1: Line-level billing query (~line 103-106)**

Add `bills.status` to the select and filter out drafts in JS:

```typescript
// Add status to the join
.select('purchase_order_line_id, amount, bill_id, bills!bill_lines_bill_id_fkey(id, reference_number, bill_date, status)')

// Then filter before processing
const activeBilled = (lineBilled || []).filter((bl: any) =>
  bl.bills?.status && !['draft'].includes(bl.bills.status)
);
```

**Change 2: PO-level billing query (~line 134-138)**

Same pattern -- add `status` to the bills join and filter out drafts:

```typescript
// Add status to the join
.select('purchase_order_id, purchase_order_line_id, cost_code_id, memo, amount, bill_id, bills!bill_lines_bill_id_fkey(id, reference_number, bill_date, status)')

// Then filter
const activePoBilled = (poBilled || []).filter((bl: any) =>
  bl.bills?.status && !['draft'].includes(bl.bills.status)
);
```

### Why the Other POs Work
They simply don't have any draft bills linked to them. Once we exclude drafts, this PO will match too.

### Files Changed
- `src/hooks/useVendorPurchaseOrders.ts` (add status to both selects, filter out draft bills)
