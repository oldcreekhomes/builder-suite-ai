

## Remove Pending/Approved Cards from Purchase Orders Page

### Summary
Remove the "Pending" and "Approved" stats cards from the Purchase Orders page, change the layout so "Total POs" and "Total Value" each take 50% width, and clean up the associated dead code.

### Changes

#### 1. Update ProjectPurchaseOrders.tsx

**Remove:**
- The `pending` and `approved` calculations from the `stats` object (lines 37-38)
- The two Card components for "Pending" and "Approved" (lines 75-98)
- The unused `Clock` and `CheckCircle` icon imports (line 10)

**Modify:**
- Change the grid from `lg:grid-cols-4` to `grid-cols-2` so the two remaining cards each take 50% width

**Before:**
```tsx
const stats = {
  total: purchaseOrders.length,
  pending: purchaseOrders.filter(po => po.status === 'draft').length,
  approved: purchaseOrders.filter(po => po.status === 'approved').length,
  totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0)
};
```

**After:**
```tsx
const stats = {
  total: purchaseOrders.length,
  totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0)
};
```

**Grid change:**
```tsx
// Before
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

// After  
<div className="grid gap-4 grid-cols-2">
```

### What's NOT being deleted

The following code will remain because it's still used for other purposes:

| Code | Reason to Keep |
|------|----------------|
| `StatusSelector.tsx` | Users can still change PO status via dropdown in the table row |
| Status values in `CreatePurchaseOrderDialog.tsx` | New POs are created with `status: 'pending'` |
| Status filtering in `BudgetDetailsPurchaseOrderTab.tsx` | Filters approved POs for budget display |
| `usePOStatus.ts` | Maps PO status for vendor confirmation display |

These components use the status field for operational purposes (setting/changing/filtering status), which is different from the stats display that's being removed.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/ProjectPurchaseOrders.tsx` | Remove Pending/Approved cards, update grid to 50/50, remove dead stats calculations, remove unused imports |

