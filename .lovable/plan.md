

## Simplify PayBillDialog Summary for Multi-Bill Payments

### Problem
The current multi-bill summary shows too much redundant information — 6 lines repeating the same data in different groupings (Total Amount, Bills subtotal, Credits Applied, Net Payment, plus individual Items). The user wants exactly 3 clear lines: the bill, the credit, and the total.

### Changes — `src/components/PayBillDialog.tsx`

**Lines 204-251** — Replace the entire multi-bill summary block with a simple item list plus total:

```tsx
{isMultiple ? (
  <>
    {/* Individual items */}
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
  </>
)
```

This produces exactly 3 lines for the example scenario:
```text
260056                    $200.00
OCH-02302 (Credit)       -$150.00
─────────────────────────────────
Total:                     $50.00
```

Remove the "Bills:", "Credits Applied:", "Net Payment:" breakdown and the separate "Items:" section entirely. The `creditExceedsBills` / `remainingCreditAfter` note is also removed since credit-only selections are already blocked at the table level.

One file, one section replaced.

