## Problem

In the schedule's Resources picker, typing a partial company name like `lcs` still surfaces internal users (Lou Cocks, Lauren Crowe, Alex Cruz, Bill Hawk, etc.) and reps from other companies. Only the full string `LCS Site Services` filters correctly.

## Root cause

`ResourcesSelector` uses shadcn's `Command` (cmdk), which by default uses a **fuzzy/subsequence** matcher. With the search `lcs`, cmdk matches any item whose value contains `l`, then `c`, then `s` in order — so `Lou Cocks`, `Lauren Crowe`, `Alex Cruz`, `Bill Hawk`, etc. all score above zero and stay visible. The match against the real `LCS Site Services` reps is correct, but the noise items aren't filtered out.

The earlier change to set each item's `value` to `"${resource.resourceName} ${resource.companyName}"` was correct — the problem is purely the matching algorithm.

## Fix

Pass a custom `filter` function to the `Command` component that does **case-insensitive substring matching** instead of subsequence matching:

```tsx
<Command
  filter={(value, search) => {
    if (!search) return 1;
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  }}
>
```

With this:
- Searching `lcs` → only items whose combined `name + company` value contains the contiguous substring `lcs` (i.e., the three LCS Site Services reps) are shown. Internal users like Lou Cocks are filtered out.
- Searching `lcs si` → narrows further but still shows the same three reps.
- Searching `matt` → still shows all Matts (substring match works on names too).
- Searching `old creek` → still shows internal users belonging to Old Creek Homes (their value contains the company name).

Note: the "Selected" group items use `value={`selected-${resourceName}`}`, so the substring `selected-` is part of those values. To keep selected items always visible while editing, the filter should also return `1` when the value starts with `selected-`.

## Files changed

- `src/components/schedule/ResourcesSelector.tsx` — add the custom `filter` prop to `<Command>`. No other changes.

## Out of scope

- No changes to `useProjectResources` (the data already includes `companyName` on internal users).
- No changes to grouping, ordering, or the existing notification-preference filter on external reps.
