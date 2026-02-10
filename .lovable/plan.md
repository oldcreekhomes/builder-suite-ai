

# Fix: A/P Aging Report Lot Filtering and "Total" Option

## Problems

1. **Both lots show identical data ($20,486.15)**: The lot filter (line 142) includes bills where all `lot_id` values are `NULL` (`lotIds.every(id => id === null)`), causing unallocated bills to appear under every lot. This means Lot 1 and Lot 2 show the same bills instead of their own subset.

2. **No "Total" option**: The LotSelector dropdown only shows individual lots. There is no way to see a combined total across all lots.

## Changes

### 1. `src/components/budget/LotSelector.tsx` -- Add a "Total" option

- Accept an optional `showTotal` prop (default `false`).
- When `showTotal` is `true`, render an additional `SelectItem` with value `"__total__"` and label `"Total"` at the end of the dropdown list.
- The A/P report will pass `showTotal={true}`.

### 2. `src/components/reports/AccountsPayableContent.tsx` -- Fix lot filtering and handle "Total"

**Lot filtering fix (line 139-144)**:
- When a specific lot is selected, only include bills that have at least one `bill_line` with that `lot_id`. Remove the `lotIds.every(id => id === null)` fallback -- bills with no lot allocation should only appear in the "Total" view, not under individual lots.

**"Total" handling**:
- When `selectedLotId` is `"__total__"`, skip the lot filter entirely (show all outstanding bills across all lots).
- Update the `enabled` condition (line 148) to also accept `"__total__"` as a valid selection.
- Update the query key to reflect the selection.

**Summary of filter logic**:
- `Lot 1` selected: only bills with a `bill_line.lot_id` matching Lot 1's ID
- `Lot 2` selected: only bills with a `bill_line.lot_id` matching Lot 2's ID
- `Total` selected: all outstanding bills regardless of lot allocation

### 3. PDF export update

- When "Total" is selected, the PDF header will show "Total" instead of a lot name.
- The `lotData` query will be skipped when `selectedLotId` is `"__total__"`.

