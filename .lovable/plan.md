
# Fix: Auto-Assign Lot ID for Single-Lot Projects in Manual Bill Entry

## The Problem You Found

You're correct - for single-lot projects like Ocean Watch, bill lines are being saved **without** a `lot_id` in the database. This creates an inconsistency:

| Entry Method | Single-Lot Project Behavior |
|--------------|----------------------------|
| Enter with AI | Automatically assigns the single lot's ID to all lines |
| Enter Manually | Saves with `lot_id = NULL` because Address column is hidden |

**Database evidence:** All bill_lines from single-lot projects have `lot_id = NULL`, even though those projects have a valid "Lot 1" record in `project_lots`.

## Why This Matters

- **Job Costs Report**: Uses `lot_id` to filter costs by lot - NULL values may be excluded
- **Data Consistency**: Multi-lot projects have proper lot assignments, but single-lot projects don't
- **Future Reporting**: Any lot-based filtering or aggregation will miss these records

## The Fix

Modify the save logic in Manual Bill Entry to auto-assign the single lot's ID when:
1. The project has exactly 1 lot
2. The row doesn't already have a `lotId` set

## Implementation

**File:** `src/components/bills/ManualBillEntry.tsx`

### Change the billLines mapping (around line 431-456)

Add logic to default `lot_id` to the single lot when applicable:

```typescript
// Get the single lot ID if project has exactly one lot
const singleLotId = lots.length === 1 ? lots[0]?.id : undefined;

const billLines: BillLineData[] = [
  ...resolvedJobRows
    .filter(row => row.accountId || row.amount)
    .map(row => ({
      line_type: 'job_cost' as const,
      cost_code_id: row.accountId || undefined,
      project_id: row.projectId || projectId || undefined,
      // Auto-assign single lot if no lot selected
      lot_id: row.lotId || singleLotId || undefined,
      purchase_order_id: row.purchaseOrderId || undefined,
      quantity: parseFloat(row.quantity) || 1,
      unit_cost: parseFloat(row.amount) || 0,
      amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.amount) || 0),
      memo: row.memo || undefined
    })),
  ...resolvedExpenseRows
    .filter(row => row.accountId || row.amount)
    .map(row => ({
      line_type: 'expense' as const,
      account_id: row.accountId || undefined,
      project_id: row.projectId || projectId || undefined,
      // Expense rows could also use singleLotId if needed
      quantity: parseFloat(row.quantity) || 1,
      unit_cost: parseFloat(row.amount) || 0,
      amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.amount) || 0),
      memo: row.memo || undefined
    }))
];
```

## What This Achieves

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Single-lot project, manual entry | `lot_id = NULL` | `lot_id = [Lot 1 UUID]` |
| Multi-lot project, no address selected | `lot_id = NULL` | `lot_id = NULL` (user must select) |
| Multi-lot project, address selected | `lot_id = [selected]` | `lot_id = [selected]` |

## Result

All bill lines will have proper `lot_id` assignment regardless of whether the Address column is visible, ensuring consistent data for reports and filtering.
