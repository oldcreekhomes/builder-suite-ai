

# Fix: Floating-Point Precision in Pay Bill Dialog

## Problem

When paying the exact remaining balance ($569.30), floating-point arithmetic produces tiny rounding errors. For example, `15569.30 - 15000.00` might yield `569.3000000000001` internally. This causes:

1. The validation error "Payment amount cannot exceed remaining balance of $569.30" even though you entered exactly $569.30
2. The "After payment" text showing "-$0.00" instead of "$0.00"

## Solution

Use cent-based (integer) arithmetic for all monetary comparisons and calculations, as recommended for currency handling.

## File: `src/components/PayBillDialog.tsx`

### Change 1: Fix `remainingBalance` calculation (line 70)

Round to 2 decimal places to eliminate floating-point drift:

```typescript
const remainingBalance = singleBill 
  ? Math.round((singleBill.total_amount - (singleBill.amount_paid || 0)) * 100) / 100 
  : 0;
```

### Change 2: Fix validation comparison (line 106)

Use cent-based comparison with a small tolerance:

```typescript
const amountCents = Math.round(amount * 100);
const balanceCents = Math.round(remainingBalance * 100);
if (amountCents > balanceCents) {
  setPaymentAmountError(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`);
  return;
}
```

### Change 3: Fix "After payment" display (line 147)

Round the remaining balance calculation:

```typescript
const newRemainingBalance = !isNaN(parsedPaymentAmount) 
  ? Math.round((remainingBalance - parsedPaymentAmount) * 100) / 100 
  : remainingBalance;
```

### Change 4: Fix default value when dialog opens (line 132)

Round the default payment amount:

```typescript
const remaining = Math.round((singleBill.total_amount - (singleBill.amount_paid || 0)) * 100) / 100;
```

These changes ensure that entering the exact remaining balance will pass validation and show "$0.00 remaining" correctly.

