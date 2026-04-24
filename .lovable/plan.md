## Port grouping + tooltips into EditBillDialog

Modify only `src/components/bills/EditBillDialog.tsx` so the Review, Rejected, Approved, and Paid editor matches the Enter with AI editor (`EditExtractedBillDialog`). No other files change. No DB / RLS / edge function work.

### 1. Wrap dialog body in `<TooltipProvider delayDuration={200}>`
Wrap the inside of `<DialogContent className="max-w-6xl ...">` (line 605) so all hover tooltips render reliably and match the Enter with AI behavior.

### 2. Add a display-grouping layer over `jobCostRows`
Mirror the logic at lines 646–716 of `EditExtractedBillDialog.tsx`:

- Build `jobCostDisplayGroups` from `jobCostRows`, keyed by:
  `accountId | unit_cost(6dp) | memo.trim() | purchaseOrderId | purchaseOrderLineId`
- A group with 2+ children renders as ONE row showing:
  - summed quantity (clean 2dp)
  - shared unit_cost
  - summed amount
  - `lotCost = amount / lotCount`
  - "All N lots" address pill with a tooltip listing each lot name
- A group with 1 child renders exactly like today (single-row editing, lot dropdown, etc.).

### 3. Add `updateJobCostGroup` and `removeJobCostGroup`
Mirror lines 723–781 of `EditExtractedBillDialog.tsx`, but operate on `ExpenseRow[]` in `jobCostRows`:

- Cent-precise per-lot AMOUNT split (extra cents go to first N children)
- Hundredth-precise per-lot QUANTITY split
- Mirror `accountId`, `account` (cost code display), `memo`, `purchaseOrderId`, `purchaseOrderLineId` to every child
- `removeJobCostGroup` → push every child `dbId` into `deletedLineIds` and drop them from `jobCostRows` (so existing save path deletes them)

### 4. Replace the job-cost `<TableBody>` (lines 800–902)
Iterate `jobCostDisplayGroups` instead of `jobCostRows`. For each group:

- Cost Code cell: wrap `CostCodeSearchInput` in a `<Tooltip>` showing the full `account` text on hover. Single-row groups call `updateJobCostRow`; grouped rows call `updateJobCostGroup`.
- Description cell: wrap `Input` in a `<Tooltip>` showing the full `memo` on hover. Same single vs grouped routing.
- Quantity / Unit Cost / Total: read from the group; writes route through `updateJobCostRow` (single) or `updateJobCostGroup` (grouped).
- Add a new **Lot Cost** column (only when `showAddressColumn`), shown to the LEFT of Address, matching `EditExtractedBillDialog` line 1282. Single-row groups show "—".
- Address cell: grouped rows show "All N lots" pill with lot-name tooltip; single rows keep today's `<Select>` lot dropdown.
- Purchase Order cell: unchanged behavior, but writes route through group when grouped.
- Actions cell: unchanged; calls `removeJobCostGroup` for grouped rows, `removeJobCostRow` for single rows. Disabled state preserved for `isApprovedBill`.

Expense tab is left exactly as-is (it does not have lot splits and already matches the Enter with AI expense layout closely enough).

### 5. Preserve every existing accounting guardrail
- `updateBill` for draft/void, `updateApprovedBill` for posted/paid, `correctBill` paths — unchanged.
- `deletedLineIds`, duplicate-invoice check, period-close checks, attachment handling — unchanged.
- `isApprovedBill` disables inputs and hides Add/Delete exactly as today.
- No new fields are persisted; grouping is a pure presentation/edit layer over the existing `bill_lines` rows.

### 6. Out of scope
- No changes to `EditExtractedBillDialog.tsx`.
- No changes to `useBills`, hooks, Supabase schema, RLS, or edge functions.
- No changes to expense-tab columns.
- The two dialog files remain separate (a full one-component merge is a follow-up).

### Result
On Review, Rejected, Approved, and Paid, opening Edit Bill shows the same grouped multi-lot rows, the same Lot Cost / "All N lots" presentation, and the same hover tooltips on Cost Code and Description as Enter with AI — without disturbing posted-bill accounting safety.
