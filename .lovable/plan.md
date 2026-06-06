## Why "An Exterior" looks broken

An Exterior's $27,180 payment is stored as a single-allocation `bill_payments` row (1 bill, 1 payment). The Account Detail dialog routes any bill that belongs to ANY `bill_payments` row through the synthetic `consolidated_bill_payment` path — even when there's only one allocation. Because `extraCount = allocations.length - 1 = 0`, the consolidated "+N" tooltip is suppressed, and the breakdown I just added only attaches to the non-consolidated bill / bill_payment rows. Result: the row falls through to the plain single-label display ("4470: Siding"), hiding the second cost code.

Homestead works because it has 3 allocations, so the consolidated "Included Bills" tooltip ("+2") fires.

## Fix

Single file: `src/components/accounting/AccountDetailDialog.tsx`.

For synthetic `consolidated_bill_payment` rows, build the same cost-code breakdown across every `bill_line` of every bill in the payment, and attach it as `accountBreakdown` / `accountBreakdownTotal`. The renderer already shows "primary +{N-1}" with the per-cost-code tooltip whenever `accountBreakdown.length > 1`, so single-allocation multi-cost-code payments will start displaying correctly.

### 1. Load all line data (not just the first line)
At line ~640 the bill_lines query for consolidated payments selects only the first-line-style fields. Change it to:
- Add `amount` to the select.
- After grouping, keep the existing `firstLineByBillForConsolidated` (used for description + primary label) unchanged.
- Build a new map `allLinesByBillForConsolidated: Map<billId, { cost_code_id, account_id, amount }[]>`.
- Push every cost_code_id / account_id from every line into `allCostCodeIds` / `allAccountIds` so the label maps cover them.

### 2. Compute breakdown in the synthetic row builder
In the `consolidatedPayments.forEach(cp => { ... })` block (~line 953), after computing `accountDisplay`, iterate `allocations` → for each `a.bill_id` look up `allLinesByBillForConsolidated.get(a.bill_id)` and aggregate `{ label, amount }` using the same rules as the bill path:
- Label = costCodesMap.get(cost_code_id) ?? accountsDisplayMap.get(account_id) ?? 'Unassigned'.
- Preserve first-seen order; sum amounts per label.

Attach `accountBreakdown` and `accountBreakdownTotal` on the synthetic `Transaction`.

### 3. Render
No render change needed — the existing branch added previously already handles `accountBreakdown.length > 1` and shows the "Included Cost Codes:" tooltip. For true multi-bill consolidated payments (Homestead) the `isConsolidated && extraCount > 0` branch still wins and continues to show the per-bill tooltip exactly as before.

## Out of scope
- No DB changes.
- Multi-bill consolidated tooltips (Homestead "Included Bills") stay exactly as they are.
- Checks, deposits, credit card lines, journal entries: unchanged.
