
## Add cents to Job Costs PDF

### Problem
The Job Costs PDF report rounds all currency values to whole dollars (e.g. `$11,226` instead of `$11,226.47`). The on-screen report shows cents — the PDF should match.

### Fix
In `src/components/reports/pdf/JobCostsPdfDocument.tsx`, update `formatCurrency` to show 2 decimal places and stop rounding:

```ts
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
```

This aligns with the project's currency formatting standard (mandatory 2-fraction digits, no `Math.round` for display).

### Files changed
1. `src/components/reports/pdf/JobCostsPdfDocument.tsx` — `formatCurrency` only.

### Out of scope
- No changes to on-screen report, totals math, or column widths (existing widths comfortably fit 2 extra characters at this font size).

### Verification
- Re-export the Job Costs PDF for Oceanwatch Court.
- Cabinets row shows `$11,226.47`, `$22,205.25`, `-$10,978.78` (or whatever the true cent values are) instead of rounded dollars.
- Subtotal and Project Total rows also show cents.
