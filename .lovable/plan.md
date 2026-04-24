## Plan: Clean 2-decimal UI for the Edit Extracted Bill dialog

### Problem
The grouped invoice rows currently show values like `0.499999`, `0.999999`, and `0.400000` because we split the original invoice quantity evenly across all lots with 6-decimal precision and then re-sum it for display. We also show lot costs like `$11.18` per lot when 19 lots × $11.18 ≠ $212.50.

You want what the invoice actually shows — clean, 2-decimal numbers — and you're fine with us absorbing tiny rounding differences (a penny here or there) on a few lots so the math still totals correctly.

### What will change
File: `src/components/bills/EditExtractedBillDialog.tsx`

1. **Display the invoice quantity, not the reconstructed sum.**
   - In `buildJobCostDisplayLines`, the group's `quantity` will be rounded to 2 decimals (`Math.round(totalQty * 100) / 100`), so `0.499999` → `0.5`, `0.999999` → `1`, `0.400000` → `0.4`.
   - The group's `unit_cost` and `amount` already display cleanly; we'll format them strictly to 2 decimals in the inputs.

2. **Display Lot Cost cleanly to 2 decimals.**
   - Show `$X.XX /lot` using `(group.amount / lotCount).toFixed(2)`.
   - This is purely display — we don't change the per-lot stored values when only rendering.

3. **Make edits feel clean too — absorb pennies on a few lots.**
   - In `updateJobCostGroup`, when the user edits Quantity or Unit Cost on a grouped row, recompute:
     - `newTotal = round(qty × rate, 2¢)` (unchanged)
     - **Per-lot quantity** = `round(newQty / lotCount, 2 decimals)` for every lot, with the leftover (e.g., one extra lot getting `0.03` instead of `0.02`) distributed to the first N lots so the children sum back to `newQty` exactly. No more 6-decimal child quantities.
     - **Per-lot amount** = `round(newTotal / lotCount, cents)` per lot, with the cent remainder distributed across the first N lots (e.g., 3 lots get $6.72 and 16 lots get $6.71, summing to $127.50). This is the "absorb a penny on a few lots" behavior you approved.
   - Same logic will run for the existing children when the dialog first loads, so already-split rows that currently show `0.499999` get re-normalized to clean values on display.

4. **Format the inputs to 2 decimals.**
   - Quantity input: show `group.quantity.toFixed(2)` (e.g., `0.50`, `1.00`, `0.40`) instead of the raw `0.499999`.
   - Unit Cost input: show `group.unit_cost.toFixed(2)` (e.g., `425.00`).
   - On change, we still parse the user's number normally so they can type freely.

### What will NOT change
- The Cost Code summary tooltip (you said it's good).
- The Address tooltip / "All N lots" indicator.
- The column widths we just rebalanced.
- The Expense tab.
- The save logic — children still persist with cent-precise amounts; quantities will now persist as clean 2-decimal values too.
- The total at the bottom (`$1,402.50`) still matches exactly because remainders are absorbed, not dropped.

### Result
Looking at your screenshot, the rows will read like the actual invoice:

| Quantity | Unit Cost | Total | Lot Cost |
|---|---|---|---|
| 0.30 | $425.00 | $127.50 | $6.71 /lot |
| 0.30 | $425.00 | $127.50 | $6.71 /lot |
| 0.50 | $425.00 | $212.50 | $11.18 /lot |
| 0.50 | $425.00 | $212.50 | $11.18 /lot |
| 1.00 | $425.00 | $425.00 | $22.37 /lot |
| 0.30 | $425.00 | $127.50 | $6.71 /lot |
| 0.40 | $425.00 | $170.00 | $8.95 /lot |

Behind the scenes, a few lots quietly absorb a 1¢ difference so every total still reconciles exactly to `$1,402.50`.
