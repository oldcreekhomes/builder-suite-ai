

## Fix: Synchronize PO Detail Dialogs

### Issues (from your screenshots)
1. Both dialogs say **"Within Budget"** — should say **"Matched"** with a check icon, matching the table badge.
2. PO 2025-923T-0005 ($27,647.92) is **missing the "This Bill" column** that PO 2025-923T-0006 ($12,860.02) correctly shows. This happens because the bill line for $27,647.92 doesn't have an explicit `purchase_order_id` stored, so the filter `l.purchase_order_id === matches[0].po_id` returns nothing → empty pending lines → no "This Bill" column.

### Changes

**`src/components/bills/PODetailsDialog.tsx` — line 173**
Change "Within Budget" to "Matched" with a Check icon:
```tsx
<Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
  <Check className="h-3 w-3" />Matched
</Badge>
```

**`src/components/bills/BillPOSummaryDialog.tsx` — line 101**
Fix the `pendingBillLines` filter for single-match case to fall back to cost code matching when no explicit PO ID is set:
```tsx
pendingBillLines={derivedPendingBillLines.filter(l => {
  if (l.purchase_order_id && l.purchase_order_id !== '__auto__' && l.purchase_order_id !== '__none__') {
    return l.purchase_order_id === matches[0].po_id;
  }
  return l.cost_code_id === matches[0].cost_code_id;
})}
```

Two files, two small edits. Both dialogs will then show "Matched" and include the "This Bill" column.

