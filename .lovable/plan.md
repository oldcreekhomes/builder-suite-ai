

## Color the "After payment" remaining balance text

### Change
In `src/components/PayBillDialog.tsx` (~line 212-215), update the "After payment: $X.XX remaining" text to be green when the remaining balance is greater than $0 and red when it equals or goes below $0.

### File
- `src/components/PayBillDialog.tsx` -- change the `text-muted-foreground` class on the "After payment" div to conditionally apply `text-green-600` or `text-red-600` based on `newRemainingBalance`.

