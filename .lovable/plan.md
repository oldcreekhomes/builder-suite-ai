

## Always Show 3 Columns with Placeholder States

### What's Changing

**`src/components/bidding/BidPackageDetailsModal.tsx`** (lines 309-332):

1. Change the grid from conditional `grid-cols-2`/`grid-cols-3` to always `grid-cols-3`
2. Always render the Historical Pricing table — when no project is selected, show placeholder text like "Select a historical project to view pricing data"
3. Always render the Adjustment table — when no historical project is selected, show the same placeholder message instead of the input (since there's nothing to adjust)
4. Cost Code Breakdown stays as-is (always visible, independent of historical selection)

### Placeholder behavior

- **Historical Pricing** (no project selected): `"Select a historical project to populate this field"` in muted text
- **Adjustment** (no project selected): Same message, since there's no base cost to adjust
- When a project IS selected, both sections show their data/inputs as they do today

### Single file edit

Replace line 309's conditional class with `"grid grid-cols-3 gap-4"`, remove the `{historicalProjectAddress && (` conditional wrapper around the Historical table (lines 310/331), and add ternary content inside both the Historical and Adjustment cells.

