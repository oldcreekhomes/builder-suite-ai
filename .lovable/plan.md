

## Block Credit-Only Payment & Fix Single-Credit Dialog

### Problem
1. Users can select only credit notes and click "Pay Selected Bills," which makes no sense — credits should only be applied alongside positive bills.
2. When a single credit is selected, the dialog shows nonsensical values because `remainingBalance` on line 71-72 of `PayBillDialog.tsx` still uses `total_amount - amount_paid` instead of the open-balance formula.

### Changes

**`src/components/bills/PayBillsTable.tsx`**

1. **Compute whether selection is credit-only** (near line 661, after `selectedTotal`):
```typescript
const hasOnlyCredits = selectedBills.length > 0 && selectedBills.every(bill => {
  const ob = bill.total_amount < 0
    ? bill.total_amount + (bill.amount_paid || 0)
    : bill.total_amount - (bill.amount_paid || 0);
  return ob < 0;
});
```

2. **Disable "Pay Selected Bills" button** (line 824) when `hasOnlyCredits` is true, and add a helper message:
```typescript
disabled={payBill.isPending || payMultipleBills.isPending || hasOnlyCredits}
```

3. **Show info message** in the toolbar when `hasOnlyCredits`:
```
"Credits can only be applied alongside bills"
```

**`src/components/PayBillDialog.tsx`**

4. **Fix single-bill `remainingBalance`** (line 71-72) to use the open-balance formula:
```typescript
const remainingBalance = singleBill
  ? Math.round(
      (singleBill.total_amount < 0
        ? singleBill.total_amount + (singleBill.amount_paid || 0)
        : singleBill.total_amount - (singleBill.amount_paid || 0)
      ) * 100
    ) / 100
  : 0;
```

This also fixes the "Original Amount" / "Previously Paid" / "Remaining" display for single credits (lines ~248-260) — those use `billsArray[0].total_amount` and `remainingBalance` which will now be correct.

