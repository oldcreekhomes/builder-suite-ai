
## Make Job Costs report Budget column read-only

### Problem
On the Job Costs report (`/project/.../accounting/reports`, Job Costs tab), the **Budget** column cells are clickable and open a budget editor. They should be view-only. Only the **Actual** column should be interactive (already working correctly). Variance is computed and stays as-is.

### Fix
Remove the click behavior and clickable styling from the Budget cell in `src/components/reports/JobCostRow.tsx`. Stop wiring `onBudgetClick` from the parent so no dialog can be triggered.

### Changes

1. **`src/components/reports/JobCostRow.tsx`**
   - Remove `onBudgetClick` from props.
   - Render the Budget `<TableCell>` as a plain right-aligned cell (no `cursor-pointer`, no `hover:underline`, no `onClick`).
   - Leave Actual cell unchanged (still calls `onActualClick`).
   - Variance cell unchanged.

2. **Parent that renders `JobCostRow`** (the Job Costs table component under `src/components/reports/`, the one that currently passes `onBudgetClick={() => setBudgetDialog(...)}`)
   - Stop passing `onBudgetClick`.
   - Remove the now-unused budget dialog state and the `JobCostBudgetDialog` import/usage if it is only triggered from this row. If `JobCostBudgetDialog` is used elsewhere, leave the file alone and only remove the trigger here.

### Out of scope (intentionally not touched)
- Actual column click → keeps opening the actual cost detail dialog.
- Variance column → already non-interactive.
- Budget page itself → still fully editable there. This change only affects the Job Costs **report**.

### Verification
- Hovering Budget values shows no underline and no pointer cursor.
- Clicking a Budget value does nothing.
- Clicking an Actual value still opens the actual cost detail.
- Numbers, totals, subtotals, and variance coloring are unchanged.
