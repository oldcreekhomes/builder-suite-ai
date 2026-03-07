

## Unify PayBillDialog Summary Format

### Problem
Single-bill and multi-bill payments show completely different summary layouts. The multi-bill format (line items + total) is cleaner and more intuitive. The single-bill format shows "Original Amount", "Previously Paid", "Remaining Balance", "Due Date", "Reference" — a different paradigm that's unnecessarily complex.

### Solution
Use the same line-item format for both single and multi-bill views. Remove the `isMultiple` conditional entirely and always render the unified format:

### Changes — `src/components/PayBillDialog.tsx`

**Lines 194** — Update title to always say "Pay Bill" or "Pay Bills" (plural only when >1):
```tsx
<DialogTitle>{billsArray.length > 1 ? `Pay ${billsArray.length} Bills` : 'Pay Bill'}</DialogTitle>
```

**Lines 204-255** — Replace the entire `isMultiple ? (...) : (...)` block with a single unified format that works for any number of bills:

```tsx
{/* Line items */}
<div className="space-y-1">
  {billsArray.map((bill) => {
    const openBalance = getOpenBalance(bill);
    const isCredit = openBalance < 0;
    return (
      <div key={bill.id} className="flex justify-between text-sm">
        <span>
          {bill.reference_number || 'No ref'}
          {isCredit && <span className="ml-1 text-green-600">(Credit)</span>}
        </span>
        <span className={isCredit ? 'text-green-600' : ''}>
          {formatCurrency(openBalance)}
        </span>
      </div>
    );
  })}
</div>
{/* Total */}
<div className="flex justify-between font-semibold pt-2 border-t">
  <span>Total:</span>
  <span>{formatCurrency(totalAmount)}</span>
</div>
```

This means a single $200 bill will show:
```
Vendor:          JZ Structural Consulting, Inc.
260056                                 $200.00
────────────────────────────────────────────────
Total:                                 $200.00
```

The Payment Amount input field (for partial payments) remains below the summary for single bills. No other changes needed.

