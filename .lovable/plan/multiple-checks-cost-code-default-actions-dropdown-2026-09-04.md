# Multiple Checks: cost-code default + Actions dropdown

Two changes to the "Enter Multiple Checks" page (`/multi-entry/checks`).

## 1) Cost Code as the default type, with a dropdown to switch
- Each row's **Type** column becomes a dropdown defaulting to **Cost Code**.
- Switching to **Account** swaps the search box in "Cost Code / Account" to the chart-of-accounts picker; switching back clears the selection.
- This is already wired in `MultiCheckTable.tsx` — the only change is making `cost_code` the starting value (currently `account`) so cost codes show first, matching how users actually enter these checks.
- Saving already handles both paths: cost code → job-cost line; account → expense line (in `useMultiCheckBatchSave.ts`).

## 2) Actions column with 3-dots dropdown
- Add an **Actions** column at the far right.
- Replace the red trash-can icon button with the app's standard `TableRowActions` 3-dot menu containing **Delete**.
- Delete keeps the same rule: disabled when only one row remains.

## Files touched
- `src/components/multi-entry/MultiCheckTable.tsx` — default `entryType: "cost_code"`, Actions column with `TableRowActions`, remove the inline trash `Button`.

No database or other-page changes.
