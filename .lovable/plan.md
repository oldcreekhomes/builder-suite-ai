

## Fix Selection Banner Total for Credits in PayBillsTable

### Problem
Line 656 in `PayBillsTable.tsx` calculates the selected total as `total_amount - amount_paid` for every bill. This is correct for regular bills but wrong for credits (negative `total_amount`), where the open balance is `total_amount + amount_paid`. This is the same bug that was just fixed in the footer total.

Example: A credit with `total_amount = -150` and `amount_paid = 0` produces `-150 - 0 = -150`, but when added to the selection total, something in the selection logic produces the wrong number ($850 or $650 instead of the expected values).

### Fix
**`src/components/bills/PayBillsTable.tsx`** — Line 656: Apply the same open-balance formula used in the footer fix:

```typescript
const selectedTotal = selectedBills.reduce((sum, bill) => {
  const openBalance = bill.total_amount < 0
    ? bill.total_amount + (bill.amount_paid || 0)
    : bill.total_amount - (bill.amount_paid || 0);
  return sum + Math.round(openBalance * 100) / 100;
}, 0);
```

Single line change, one file.

