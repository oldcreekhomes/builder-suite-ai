

## Fix Footer Total in Manage Bills Tables

### Problem
The "Total amount" footer in the Approved tab (and potentially other tabs) sums raw `bill.total_amount` values instead of the **displayed** open balance amounts. When credits (negative amounts) and regular bills are mixed, the footer total does not match what users see in the Amount column.

The Amount column in PayBillsTable displays the open balance:
- Credits: `total_amount + amount_paid`
- Regular bills: `total_amount - amount_paid`

But the footer just sums `bill.total_amount`, ignoring partial payments and using raw values.

### Plan

**`src/components/bills/PayBillsTable.tsx`** (line 1149)
Update the footer reduce to use the same open balance formula as the display column:
```typescript
filteredBills.reduce((sum, bill) => {
  const openBalance = bill.total_amount < 0
    ? bill.total_amount + (bill.amount_paid || 0)
    : bill.total_amount - (bill.amount_paid || 0);
  return sum + Math.round(openBalance * 100) / 100;
}, 0)
```

**`src/components/bills/BillsApprovalTable.tsx`** (line 1028)
Same fix for consistency — the Paid tab shows bills here and should also reflect open balances correctly if amount_paid is relevant.

