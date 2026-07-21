## Fix: allow deleting the last line in Edit Bill

### Why it's blocked today
In `src/components/bills/EditBillDialog.tsx`:

- `removeJobCostRow` early-returns unless `jobCostRows.length > 1`.
- `removeExpenseRow` early-returns unless `expenseRows.length > 1`.
- The trash buttons are `disabled={jobCostRows.length === 1}` / `disabled={expenseRows.length === 1}`.

So when a tab has exactly one row, the red trash icon is disabled — which is what's happening in your screenshot (the Job Cost tab has one line, even though the bill also has an Expense line worth $55).

### Change
Relax the guard so the last row on a tab can be removed as long as the **bill as a whole** still has at least one line (job cost OR expense). Save already enforces "at least one line item" via the existing `billLines.length === 0` check, so nothing else is needed.

Concretely in `EditBillDialog.tsx`:

1. `removeJobCostRow`: allow deletion when `jobCostRows.length > 1` **or** `expenseRows.length >= 1`. When removing the last job-cost row, replace state with `[]` (empty) instead of keeping a stub row, and still push its `dbId` into `deletedLineIds`.
2. `removeExpenseRow`: mirror the same logic against `jobCostRows`.
3. Trash button `disabled` props: change to `disabled={jobCostRows.length === 1 && expenseRows.length === 0}` and the symmetric version on the expense tab (plus keep the existing `isApprovedBill` gating untouched).
4. Rendering: the tables already `.map` over the rows, so an empty array simply renders no rows — no other UI changes needed. The "+ Add Line" button on each tab continues to let the user add a fresh row.

### Out of scope
- No changes to save/validation logic, PO matching, approvals, accounting, or any other dialog.
- No styling changes.