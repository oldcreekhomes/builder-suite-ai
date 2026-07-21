## Diagnosis

The StraightTalk expense line I re-inserted earlier has `unit_cost = 0` and `amount = 15.00` in the database. The Edit Bill dialog loads Expense rows the same way it loads Job Cost rows — it reads `line.unit_cost` into the row's `amount` field (line 249 in `EditBillDialog.tsx`). Because `unit_cost = 0`, the dialog shows Unit Cost = 0 and Total = $0.00, even though the bills list correctly shows $15.00 (which comes from `bills.total_amount`).

So the Expense tab UI is already built the same way as Job Cost — the bug is bad data on this single line, plus no safety net for lines where `unit_cost` is missing.

## Plan

1. **Fix the StraightTalk line data** via a one-off SQL update: set `unit_cost = 15.00`, `quantity = 1` on bill line `4036119b-6d4f-4544-b1f4-e3ce5605b054`. Amount stays 15.00. After this the Edit Bill dialog will display: Qty 1, Unit Cost 15.00, Total $15.00, Description "Phone".

2. **Add a loader fallback in `src/components/bills/EditBillDialog.tsx`** so any legacy line where `unit_cost = 0` but `amount > 0` still displays correctly. In the `.map(...)` for both Job Cost and Expense rows, compute:
   - `unit_cost_display = line.unit_cost && line.unit_cost !== 0 ? line.unit_cost : (line.quantity ? line.amount / line.quantity : line.amount)`
   
   This is display-only — on save the existing logic recomputes `amount = qty * unit_cost` normally.

3. **No changes** to the Expense tab columns/layout — they already mirror Job Cost (Account, Description, Quantity, Unit Cost, Total, Actions).

### Technical details

- File: `src/components/bills/EditBillDialog.tsx`, the two `.map(...)` blocks around lines 214–251.
- SQL: single `UPDATE bill_lines SET unit_cost = 15.00, quantity = 1 WHERE id = '4036119b-6d4f-4544-b1f4-e3ce5605b054'` (no migration needed — data fix only, via `supabase--insert`-style write).