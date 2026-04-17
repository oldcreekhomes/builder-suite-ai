
## Problem
Dashboard LTV (Loan-to-Value) shows the wrong value. Currently it's computed from `loanAmount / assetValue` where `assetValue = NOI / target_cap_rate`. The user wants it to be the simple ratio of the inputs:

`LTV = Loan Amount / Estimated Value`

## Fix
In `src/hooks/useApartmentInputs.ts` (line 156), change:

```ts
const ltvComputed = assetValue > 0 ? (loanAmount / assetValue) * 100 : 0;
```

to use `estimated_value` from inputs:

```ts
const ltvComputed = inputs.estimated_value > 0
  ? (loanAmount / inputs.estimated_value) * 100
  : 0;
```

This keeps the Dashboard's "Loan-to-Value (LTV)" row showing `loan_amount ÷ estimated_value`, matching the inputs the user enters.

## File
- `src/hooks/useApartmentInputs.ts` (single line change)
