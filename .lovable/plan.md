
The stack overflow hint is exactly right — the issue is almost certainly an RLS `WITH CHECK` clause or a CHECK constraint on `apartment_inputs` that requires `affordable_units > 0` and/or `affordable_rent > 0`.

Also worth checking: the client-side `updateInput` uses `parseFloat(value) || 0` which already allows 0, so the block isn't client-side. And `Number(data[key]) || DEFAULT_INPUTS[key]` in the read path will fall back to the default (1 unit, $2,800) when the DB value is 0 — so even if we fix the save, the UI will still display the default. That's a second bug to fix.

## Plan

1. **Investigate** `apartment_inputs` table:
   - Check CHECK constraints (`information_schema.check_constraints`)
   - Check RLS policies' `WITH CHECK` clauses
   - Identify any `> 0` rule on `affordable_units`, `affordable_rent`, `market_units`, `market_rent`

2. **Migration** to drop/relax any constraint blocking 0 values on those numeric input fields (allow `>= 0`).

3. **Fix the read fallback bug** in `src/hooks/useApartmentInputs.ts`:
   - Replace `Number(data[key]) || DEFAULT_INPUTS[key]` with a null/undefined check so a saved `0` is preserved instead of being replaced by the default.

## Files
- New migration: relax CHECK/RLS constraints on `apartment_inputs` to allow 0.
- Edit `src/hooks/useApartmentInputs.ts`: fix the `inputs` mapping to preserve explicit 0 values.

## Out of scope
No UI/calculation changes.
