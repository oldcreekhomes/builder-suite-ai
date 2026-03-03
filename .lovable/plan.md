
Goal
- Make the Vendor Bid dialog reopen with the same allocation choice that was actually saved:
  - Full amount stays Full.
  - Divide by 19 lots stays Divide.

Root cause found
- Current reopen inference uses:
  - `expectedPerLot = bidTotal / lotCount`
  - `isPerLot = abs(savedUnitPrice - expectedPerLot) < 0.02`
- In your current data shape for this project/cost code, the saved per-lot value is `1072.86` (remainder-safe split), not `1072.73`.
- That difference (`~0.13`) is outside `0.02`, so dialog incorrectly falls back to Full on reopen.

What to change
1) Strengthen allocation-mode inference in `src/components/budget/BudgetDetailsModal.tsx`
- Replace the single per-lot comparison with deterministic matching against all valid saved values:
  - `fullAmount = bidTotal`
  - `basePerLot = floor((bidTotal / lotCount) * 100) / 100`
  - `remainderPerLot = Number((bidTotal - basePerLot * (lotCount - 1)).toFixed(2))`
- Infer mode as:
  - `full` if `savedUnitPrice` is near `fullAmount`
  - `per-lot` if near `basePerLot` OR near `remainderPerLot`
  - otherwise keep safe fallback (`full`)

2) Ensure inference runs at the right moments
- Keep inference effect tied to open/load context (`isOpen`, `selectedBidId`, `availableBids`, `budgetItem.unit_price`, `lotCount`) so reopened dialog always rehydrates from persisted data.
- Do not rely on prior in-memory state between closes.

3) Optional hardening (same file)
- Add a tiny helper `isNear(a,b,epsilon=0.02)` to keep logic readable and consistent.
- If no matching bid or no saved unit price, default to `full`.

Why this fixes your exact issue
- The row currently stores per-lot as `1072.86` (remainder lot value), which the old logic rejects.
- New logic explicitly recognizes both per-lot forms (`1072.73` and `1072.86`) as valid “Divide” saves, so reopen state matches what you applied.

Validation after implementation
- Apply “Divide by 19 lots” -> close -> reopen: “Divide by 19 lots” is selected.
- Apply “Full amount” -> close -> reopen: “Full amount” is selected.
- Verify both states continue to show correct Total Budget and no regressions in Apply flow.
