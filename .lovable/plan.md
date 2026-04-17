
## Problem
There are two fields labeled "Estimated Value" on the Inputs page that write to different DB columns:

| Inputs page label | Card | DB column | Value |
|---|---|---|---|
| Estimated Value | Property & Revenue | `construction_costs` | $14,725,000 |
| Estimated Value | Taxes | `estimated_value` | $11,500,000 |

The Dashboard LTV currently uses `estimated_value` ($11.5M, the tax basis) → 9.75M / 11.5M = 84.78%.

The user wants LTV based on the Property & Revenue "Estimated Value" ($14.725M) → 9.75M / 14.725M = 66.21%.

## Fix
In `src/hooks/useApartmentInputs.ts` line 156, change the LTV denominator from `inputs.estimated_value` to `inputs.construction_costs` (which is what the Property & Revenue "Estimated Value" field actually writes to):

```ts
const ltvComputed = inputs.construction_costs > 0
  ? (loanAmount / inputs.construction_costs) * 100
  : 0;
```

## Note on naming
The two "Estimated Value" labels writing to different columns is confusing and is the root cause of this bug. After the LTV fix, we should consider either:
- Renaming the Taxes-card field to "Tax Assessed Value" (so only one field is "Estimated Value"), or
- Consolidating both into a single `estimated_value` column.

I'll do the LTV fix now and flag the naming cleanup as a follow-up question.

## File
- `src/hooks/useApartmentInputs.ts` (single line change)
