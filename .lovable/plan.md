## Fix total mismatch by using one bill-line math path everywhere

The mismatch is coming from `EditBillDialog`: the visible rows are grouped for display, but the bottom-left footer still recomputes totals from the raw underlying rows with separate inline reducers. That means the dialog is not using the same calculation/display pipeline as Enter with AI, and the math is duplicated in multiple places.

### What I will build

1. Create one shared bill-line math/display helper used by both editors:
   - `EditExtractedBillDialog` (Enter with AI + Review pending uploads)
   - `EditBillDialog` (Rejected, Approved, Paid, and other posted-bill entry points)

2. Move all grouping + total logic into the shared helper so both dialogs use the same rules for:
   - grouping split lot rows
   - per-row displayed total
   - lot cost
   - job cost subtotal
   - expense subtotal
   - overall bill total

3. Fix `EditBillDialog` so the Job Cost footer is derived from the same normalized display math as the rows above it, instead of ad hoc inline `reduce()` calls.

4. Remove duplicated inline total reducers in both dialogs and replace them with shared selectors/computations, so we stop reinventing this every time.

5. Keep posted-bill accounting safety intact:
   - no schema changes
   - no RLS / edge function changes for this fix
   - `updateApprovedBill`, `updateBill`, and `correctBill` behavior stays intact
   - only the UI math/display layer is unified unless a save-path mismatch is confirmed during implementation

### Files to update

- New shared helper file for bill line grouping/total math
- `src/components/bills/EditBillDialog.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`
- If needed for consistency, any bill table display that should match the same bill total rules, especially:
  - `src/components/bills/BillsApprovalTable.tsx`

### Technical details

Shared helper responsibilities:

```text
raw lines/rows
  -> normalize line shape
  -> build grouped display rows
  -> compute row totals consistently
  -> compute job cost subtotal / expense subtotal / grand total
  -> feed UI in both dialogs
```

Key normalization rule:
- `EditBillDialog` currently stores unit cost in the `amount` string field of `ExpenseRow` and derives row total as `quantity * amount`.
- `EditExtractedBillDialog` uses explicit numeric `unit_cost` and `amount` fields.
- I will normalize both into one internal shape before grouping or totaling so both dialogs render and subtotal identically.

Footer fix in `EditBillDialog`:
- replace repeated inline reducers at the Job Cost footer, Expense footer, and notes dialog amount source
- use shared subtotal values instead
- ensure grouped-row display and footer always agree

Consistency target:
- Enter with AI
- Review
- Rejected
- Approved
- Paid
all use the same displayed line math and total math, with no separate hand-written reducers.

### Out of scope

- No backend rewrite
- No database migration
- No edge-function rewrite unless implementation reveals a persisted line-amount inconsistency that also affects saved totals outside the dialog

### Result

The line-item rows and the bottom totals will match, and the same bill math rules will be used across Enter with AI, Review, Rejected, Approved, and Paid instead of maintaining two drifting implementations.