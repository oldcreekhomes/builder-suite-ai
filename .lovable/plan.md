# Fix: Historical tab in Budget Details doesn't match the budget row

## What's wrong (confirmed in the data)

Nob Hill's 4010 Parking budget row is saved as:
- source: Historical, amount $92.43 (stored as quantity 1 x unit_price 92.43)
- historical project reference: the source project's ID only, with no lot

The source project stores its actual costs **per lot** (4010 exists there three times: $92.34, $92.33, $92.43 — the $92.43 one belongs to a specific lot).

So in the details dialog:
1. The "Select a Historical Project" dropdown lists entries keyed as `project + lot`. The saved value has no lot, so nothing matches and the box renders blank.
2. The lookup then queries the source project for rows with no lot, finds none, and prints "No data" / Total $0.00.

The budget table shows the right number only because it falls back to the stored unit_price.

## The fix (details dialog only, no budget-table changes)

In `src/components/budget/BudgetDetailsModal.tsx`:

1. **Resolve the saved reference to a real option.** When the stored `historical_project_id` has no lot part, look through the historical project options for entries under that same project. If exactly one exists, select it. If several exist, pick the one whose actual cost for this cost code equals the budget row's saved amount; otherwise pick the first. This makes the dropdown show the correct source project/lot instead of blank.

2. **Never show "No data" when the budget has a value.** If the historical lookup returns nothing for this cost code, fall back to the amount already saved on the budget row so the Actual Cost cell and Total Budget in the dialog equal what the budget table shows ($92.43).

3. Keep Apply behavior unchanged: applying writes the resolved project/lot key and the displayed amount, so re-opening stays consistent.

## Notes

This is a display/resolution fix in the dialog. No migration, no change to how budget rows compute their amounts. Existing rows with lot-less historical references get corrected on the next Apply.
