

# Fix: Floating-Point Precision in Bill Payment Mutation

## Problem

The dialog-side fix is working (it shows "$0.00 remaining" correctly), but the **mutation in `useBills.ts`** has the same floating-point bug. At line 760:

```typescript
const remainingBalance = bill.total_amount - (bill.amount_paid || 0);
```

This produces something like `569.3000000000001`, and when compared to the user's input of `569.30`, the check `amountToPay > remainingBalance` passes -- but due to floating-point, sometimes the comparison flips and triggers the error.

## Solution

Apply the same cent-based rounding fix to `useBills.ts` line 760 and line 767.

## Changes

### File: `src/hooks/useBills.ts`

**Line 760** -- Round `remainingBalance`:
```typescript
const remainingBalance = Math.round((bill.total_amount - (bill.amount_paid || 0)) * 100) / 100;
```

**Line 767** -- Use cent-based comparison:
```typescript
if (Math.round(amountToPay * 100) > Math.round(remainingBalance * 100)) {
```

These two changes ensure the mutation-level validation matches the dialog-level fix already in place.

