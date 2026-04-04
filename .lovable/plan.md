

## Match Inputs Page Styling to Dashboard

### Problem
The Inputs page has several visual inconsistencies compared to the Dashboard:
1. **Dollar sign color**: Dashboard uses default (dark) text for `$` values; Inputs uses `text-muted-foreground` (lighter) for the `$` prefix
2. **Spacing between `$` and value**: Dashboard has no gap (dollar sign is part of the formatted string via `fmt()`); Inputs has a `gap-1` between a separate `$` span and the input field
3. **Row spacing in Operating Expenses**: Dashboard uses `space-y-2` in the 3-column expense section; Inputs also uses `space-y-2` but the input height and alignment create different visual spacing
4. **Total Taxes row styling**: Uses `items-center` which differs from Dashboard's simpler `Row` component

### Approach
Align every styling detail in `EditableRow` and the Inputs layout to exactly match the Dashboard's `Row` component patterns:

1. **Remove separate prefix/suffix spans** -- Instead of rendering `$` as a separate element with a gap, integrate it into the input display so it sits tight against the value (no `gap-1`)
2. **Match prefix color** -- Change prefix `$` from `text-muted-foreground` to default text color (darker, matching Dashboard)
3. **Match suffix color** -- Same treatment for `%` suffixes
4. **Fix Total Taxes row** -- Style identically to Dashboard's `Row` component (remove `items-center`, match class names exactly)
5. **Consistent row structure** -- Keep the same `flex justify-between` without `items-center` to match Dashboard's `Row`

### Files Changed
- `src/pages/apartments/ApartmentInputs.tsx` -- Update `EditableRow` styling and Total Taxes row

