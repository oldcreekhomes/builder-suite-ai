# Job Costs report: cleaner group headers

Tighten up the grouped layout on the Job Costs report so each grey group band carries the group name and nothing else.

## Changes

1. **Grey group header row** — remove the Budget / Actual / Variance figures currently shown on the right of the grey band (the "1000 / $64,370 / $64,370 / $0" numbers).
2. **Group title in the grey band** — show the group's name next to its number, e.g. `1000  LAND ACQUISITION COSTS`, `2000  SOFT COSTS`.
3. **Redundant header line below** — delete the detail row whose cost code equals the group number (the `1000 — LAND ACQUISITION COSTS — $0.00` line), since its title now lives in the grey band and it carries no real dollars.
4. Keep the `Subtotal - 1000` row at the bottom of each expanded group and the project total row unchanged.

## Technical notes

- `src/components/reports/JobCostGroupHeader.tsx`: drop the three currency cells (span the row across all 5 columns) and render an optional `groupName` beside the group code.
- `src/components/reports/JobCostsContent.tsx`: when building each group, pull the row where `row.costCode === group` out of the list — use its `costCodeName` as the header's `groupName`, and exclude it from the rendered detail rows. Group subtotals continue to be computed over the remaining rows (that row is $0 today, but subtotals will be calculated from what is displayed so the math always ties).
- No changes to the PDF export unless you want it to match — say the word and I'll mirror it in `JobCostsPdfDocument.tsx`.
