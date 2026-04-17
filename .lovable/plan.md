
The Dashboard shows "undefined" because `computed.units` evaluates to `NaN`/undefined when the legacy fields path is hit. Looking at the hook: `units = (inputs.market_units || 0) + (inputs.affordable_units || 0)` — that should work. But the issue is likely that `INPUT_FIELDS` includes the new fields, and `Number(data[key]) || DEFAULT_INPUTS[key]` — if `data[key]` is 0 it falls to default. That's fine.

The real issue: `String(computed.units)` shows "undefined" → meaning `computed.units` is `undefined`. This happens because `data` exists but `market_units`/`affordable_units` columns may not be present on existing rows (NULL). `Number(null)` = 0, `0 || DEFAULT` = 18/1. So units should = 19.

Wait — looking more carefully, the dashboard shows GPR = $984,000 which IS (18×4400 + 1×2800)×12, so market_units=18 and affordable_units=1 ARE loaded correctly. Yet units shows "undefined".

That means `computed.units` itself is undefined — likely `computeFinancials` doesn't return `units` in the returned object. Checking the hook return: the returned object lists `grossPotentialRent, vacancyLoss, egi, ...` but I don't see `units` in the return statement.

## Fix
Add `units` to the returned object in `computeFinancials` in `src/hooks/useApartmentInputs.ts`.

```ts
return {
  units,
  grossPotentialRent,
  ...
};
```
