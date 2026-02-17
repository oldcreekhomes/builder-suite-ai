

## Fix: Pass purchase_order_id to BillPOSummaryDialog

### Problem
The PO Summary dialog shows $720 for the Decks PO instead of $1,032 because `purchase_order_id` is not being passed in the `bill_lines` data. Without it, the dialog falls back to cost code matching, which fails when a PO's top-level cost code differs from the bill line's cost code.

### Fix
One line addition in `src/components/bills/BatchBillReviewTable.tsx` (around line 990 in the `bill_lines` mapping):

**Before:**
```tsx
return (bill?.lines || []).map(l => ({
  cost_code_id: l.cost_code_id,
  amount: l.amount || 0,
}));
```

**After:**
```tsx
return (bill?.lines || []).map(l => ({
  cost_code_id: l.cost_code_id,
  amount: l.amount || 0,
  purchase_order_id: l.purchase_order_id,
}));
```

### Why This Works
`BillPOSummaryDialog` already checks `purchase_order_id` first in its `getThisBillAmount` function before falling back to `cost_code_id`. We just weren't passing the data through.

### Expected Result
- Siding PO: This Bill = $3,500
- Framing Labor PO (0006): This Bill = $1,032 (Decks line, matched by purchase_order_id)
- Framing Labor PO (0056): This Bill = $720 (its own separate line, matched by purchase_order_id)
