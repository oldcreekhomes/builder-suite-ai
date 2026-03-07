

## Fix: Make "Over" Badge in Table Match "Over Budget" Dialog Styling

### Problem
The table's PO status badge for `over_po` uses **yellow/amber** styling (`bg-yellow-100 text-yellow-700`), but the PODetailsDialog shows **red** styling for "Over Budget." These should be visually consistent.

### Changes — `src/components/bills/POStatusBadge.tsx`

**Lines 25-32** — Change the `over_po` case from yellow to red, and update the label from "Over" to "Over Budget" to match the dialog:

```typescript
case 'over_po':
  return {
    icon: AlertTriangle,
    label: 'Over Budget',
    tooltip: 'Cumulative bills exceed PO amount',
    bgClass: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200',
    iconClass: 'text-red-600',
  };
```

One file, one section. The badge will now show a red "Over Budget" label matching the dialog exactly.

