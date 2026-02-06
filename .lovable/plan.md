

# Add "Split Evenly" Checkbox to Manual Bill Entry

## What You're Asking For

Add a checkbox column between "Purchase Order" and "Action" that, when clicked, automatically splits the current row's amount evenly across all project lots (creating new rows for each lot).

## Design Options

### Option A: Checkbox Per Row (Recommended)
A small checkbox next to each row that, when clicked, instantly splits that single row into N rows (one per lot), dividing the amount evenly.

**Pros:**
- User controls exactly which rows to split
- Immediate visual feedback
- Works well for mixed scenarios (some rows need splitting, others don't)

### Option B: Global "Split All" Button
A single button above the grid that splits ALL rows without a lot_id assigned.

**Pros:**
- One click splits everything
- Simpler UI

**Cons:**
- Less control per row

**I recommend Option A** - it gives users granular control and matches the row-level nature of the form.

## UI Design

### Column Layout (when multi-lot project)

Current:
```
Cost Code | Memo | Qty | Cost | Total | Address | Purchase Order | Action
```

New:
```
Cost Code | Memo | Qty | Cost | Total | Address | Purchase Order | Split | Action
```

### The "Split" Column
- **Header**: Small icon (Split icon or "÷") with tooltip "Split evenly across addresses"
- **Per-row**: A button/icon that appears only when:
  1. Row has an amount > 0
  2. Row does NOT already have a lot_id assigned
  3. Project has 2+ lots

- **On click**: The row transforms into N rows (one per lot), each with:
  - Same cost code/account, memo, PO
  - Quantity = 1 (or original quantity split)
  - Amount = original amount / N (with penny rounding to last row)
  - lot_id assigned to each respective lot

### Visual Example

**Before clicking split (1 row with $300):**
```
| Framing | Materials | 1 | $300.00 | $300.00 | Select | No PO | [÷] | [🗑] |
```

**After clicking split (3 rows, one per lot):**
```
| Framing | Materials | 1 | $100.00 | $100.00 | Lot 1 | No PO | -- | [🗑] |
| Framing | Materials | 1 | $100.00 | $100.00 | Lot 2 | No PO | -- | [🗑] |
| Framing | Materials | 1 | $100.00 | $100.00 | Lot 3 | No PO | -- | [🗑] |
```

## Technical Implementation

### Grid Layout Changes

Update `grid-cols-24` to `grid-cols-25` (or adjust column spans) to accommodate the new Split column:

```
Cost Code: col-span-4
Memo: col-span-5
Quantity: col-span-2
Cost: col-span-2
Total: col-span-2
Address: col-span-3
Purchase Order: col-span-4  (reduced from 5)
Split: col-span-1
Action: col-span-1
```

### New "Split Row" Function

```typescript
const splitRowEvenly = (rowId: string, rowType: 'job_cost' | 'expense') => {
  const rows = rowType === 'job_cost' ? jobCostRows : expenseRows;
  const setRows = rowType === 'job_cost' ? setJobCostRows : setExpenseRows;
  
  const rowToSplit = rows.find(r => r.id === rowId);
  if (!rowToSplit || lots.length < 2) return;
  
  const originalAmount = parseFloat(rowToSplit.amount) || 0;
  const originalQty = parseFloat(rowToSplit.quantity) || 1;
  const totalValue = originalAmount * originalQty;
  
  // Calculate per-lot amount
  const perLotAmount = Math.floor((totalValue / lots.length) * 100) / 100;
  const remainder = totalValue - (perLotAmount * (lots.length - 1));
  
  // Create new rows for each lot
  const newRows: ExpenseRow[] = lots.map((lot, index) => ({
    id: `${rowId}_split_${lot.id}`,
    account: rowToSplit.account,
    accountId: rowToSplit.accountId,
    project: rowToSplit.project,
    projectId: rowToSplit.projectId,
    lotId: lot.id,
    purchaseOrderId: rowToSplit.purchaseOrderId,
    quantity: '1',
    amount: index === lots.length - 1 
      ? remainder.toFixed(2) 
      : perLotAmount.toFixed(2),
    memo: rowToSplit.memo
  }));
  
  // Replace original row with split rows
  const rowIndex = rows.findIndex(r => r.id === rowId);
  const updatedRows = [
    ...rows.slice(0, rowIndex),
    ...newRows,
    ...rows.slice(rowIndex + 1)
  ];
  
  setRows(updatedRows);
};
```

### Split Button Component

```tsx
{showAddressColumn && !row.lotId && parseFloat(row.amount) > 0 && (
  <div className="col-span-1 flex items-center justify-center">
    <Button
      onClick={() => splitRowEvenly(row.id, 'job_cost')}
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      title="Split evenly across all addresses"
    >
      <Divide className="h-4 w-4" />
    </Button>
  </div>
)}
```

## Files to Change

| File | Changes |
|------|---------|
| `src/components/bills/ManualBillEntry.tsx` | Add Split column to grid, add `splitRowEvenly` function, add split button to each row |

## Behavior Summary

| Scenario | Split Button Visible? | Action |
|----------|----------------------|--------|
| 1 lot project | No (column hidden) | N/A |
| Multi-lot, no amount | No | N/A |
| Multi-lot, has amount, no lot assigned | Yes | Splits into N rows |
| Multi-lot, lot already assigned | No | Row already allocated |

## Edge Cases Handled

- **Odd penny amounts**: Last lot gets the remainder (e.g., $100 / 3 = $33.33 + $33.33 + $33.34)
- **Zero quantity**: Defaults to 1 for each split row
- **Already has lot_id**: Split button hidden - row is already allocated
- **After split**: Each new row can still be individually edited or deleted

