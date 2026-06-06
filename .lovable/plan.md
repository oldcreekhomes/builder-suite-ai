## Problem

In the Account Detail dialog (e.g. Atlantic Union Bank), consolidated bill payments correctly show "Primary Account +N" with a hover tooltip listing every cost code and its amount (Homestead Building Supplies, +2).

Single-bill rows (Bill or Bill Pmt - Check, e.g. An Exterior $27,180) do NOT show this, even when the underlying bill has multiple cost codes. The Account column only shows the first line's cost code ("4470: Siding"), hiding the fact that 4400: Exterior Trim/Cornice is also part of the bill.

Both should behave identically.

## Fix

Single file: `src/components/accounting/AccountDetailDialog.tsx`.

### 1. Load bill line amounts
The bills query at line ~376 already selects `bill_lines(memo, line_number, account_id, cost_code_id)`. Add `amount` so we can sum per cost code.

### 2. Build a breakdown per bill
When populating `billsMap` (around line 445), aggregate `bill_lines` into a `costCodeBreakdown: { label: string; amount: number }[]` using the same "group by visible cost-code/account label" rule already used elsewhere (`src/lib/billListDisplay.ts`):
- Prefer `cost_codes` label, else `accounts` label, else fallback.
- Sum amounts per label, preserve first-seen order.
- Primary label = first non-fallback entry (matches current `firstLineCostCodeId` behavior).

### 3. Attach breakdown to bill / bill_payment transactions
In the transaction-mapping block (line ~863, `source_type === 'bill' || 'bill_payment'`):
- Set `accountDisplay` to the primary label (unchanged behavior when only one cost code).
- Add a new field `accountBreakdown` (array of `{ label, amount }`) and `accountBreakdownTotal` (sum) onto the `Transaction` for use by the renderer.

Add `accountBreakdown?: { label: string; amount: number }[]` and `accountBreakdownTotal?: number` to the `Transaction` interface (top of file near line 46/57).

### 4. Render the +N badge + tooltip
In the Account column (line ~1420), extend the existing condition:

```text
if (isConsolidated && extraCount > 0)       -> existing consolidated tooltip
else if (accountBreakdown && length > 1)    -> NEW: "primary +{N-1}" with tooltip
                                               showing each {label, amount} + Total
else                                        -> existing single-label render
```

The new tooltip mirrors the consolidated one: header "Included Cost Codes:", one row per cost code with the summed amount, and a Total row.

## Out of scope

- No DB changes, no mutation paths, no lock logic.
- Checks, Deposits, Credit Card lines, and manual JE rows are not changed (the user only flagged bills/bill payments and those already only have one displayed account by design — can revisit if needed).
- The Edit Bill dialog, PO summary, and consolidated-payment tooltip stay exactly as they are.
