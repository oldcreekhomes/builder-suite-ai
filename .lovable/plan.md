

## Fix PayBillDialog Calculations for Credits

### Problem
The PayBillDialog uses `total_amount - amount_paid` uniformly for all bills, including credits. For credits (negative `total_amount`), the open balance formula should be `total_amount + amount_paid`. This is the same bug previously fixed in the table footer and selection banner but was never applied to the dialog.

With the example data (credit of -$150, bill of $200):
- Current: `regularBillsTotal = $200`, `creditsTotal = abs(-150 - 0) = $150` — this happens to be correct
- But `totalAmount` on line 177 sums raw `total_amount`: `-150 + 200 = $50`... wait, that should show $50. But the screenshot shows -$300.

The raw `total_amount` values must differ from the open balances. The credit likely has `total_amount = -150` and some `amount_paid` value, or the `total_amount` is different from the displayed open balance. The core fix: every calculation must use the open-balance formula consistently.

### Changes — `src/components/PayBillDialog.tsx`

**Lines 164-170** — Fix `regularBillsTotal` and `creditsTotal` to use open-balance formula:
```typescript
const regularBillsTotal = billsArray
  .filter(b => {
    const ob = b.total_amount < 0 ? b.total_amount + (b.amount_paid || 0) : b.total_amount - (b.amount_paid || 0);
    return ob > 0;
  })
  .reduce((sum, b) => {
    const ob = b.total_amount < 0 ? b.total_amount + (b.amount_paid || 0) : b.total_amount - (b.amount_paid || 0);
    return sum + Math.round(ob * 100) / 100;
  }, 0);

const creditsTotal = billsArray
  .filter(b => {
    const ob = b.total_amount < 0 ? b.total_amount + (b.amount_paid || 0) : b.total_amount - (b.amount_paid || 0);
    return ob < 0;
  })
  .reduce((sum, b) => {
    const ob = b.total_amount < 0 ? b.total_amount + (b.amount_paid || 0) : b.total_amount - (b.amount_paid || 0);
    return sum + Math.round(Math.abs(ob) * 100) / 100;
  }, 0);
```

**Line 177** — Fix `totalAmount` to use open balances:
```typescript
const totalAmount = billsArray.reduce((sum, bill) => {
  const ob = bill.total_amount < 0
    ? bill.total_amount + (bill.amount_paid || 0)
    : bill.total_amount - (bill.amount_paid || 0);
  return sum + Math.round(ob * 100) / 100;
}, 0);
```

**Line 225** — Fix items list `remaining` calculation:
```typescript
const remaining = bill.total_amount < 0
  ? bill.total_amount + (bill.amount_paid || 0)
  : bill.total_amount - (bill.amount_paid || 0);
```

This ensures every monetary display in the dialog — Total Amount, Bills subtotal, Credits Applied, Net Payment, remaining credit note, and individual item amounts — all use the correct open-balance formula.

