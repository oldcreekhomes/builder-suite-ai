## Problem

When you change Purchase Order to "No purchase order" in the Edit Bill dialog, the bill row still shows "Matched" in the PO Status column.

Root cause: `EditBillDialog.handleSave` runs the PO selection through `sanitizePoId`, which turns the `__none__` sentinel into `null`. The `purchase_order_id` column is correctly cleared, but the companion `po_assignment` column is never written. The matcher in `useBillPOMatching.ts` (lines 90–114) only treats a line as "No PO" when **either** the sentinel is present **or** `po_assignment === 'none'`. With both signals missing, it falls back to vendor + cost code matching, finds the original PO, and re-labels the bill "Matched".

React Query invalidation is already wired (`['bill-po-matching']` is invalidated on both `updateBill` and `updateApprovedBill`), so the table refreshes — it just refreshes to the same (wrong) result.

## Fix

Persist `po_assignment` alongside `purchase_order_id` whenever Edit Bill saves a line. Encoding:

- Raw selection `__none__` → `po_assignment = 'none'`, `purchase_order_id = null`
- Real UUID (user picked a specific PO) → `po_assignment = null`, `purchase_order_id = <uuid>`
- Empty / undefined → `po_assignment = null`, `purchase_order_id = null`

### Files

1. **`src/utils/poSentinelUtils.ts`** — add a small helper:
   ```ts
   export function derivePoAssignment(raw: string | null | undefined): 'none' | null {
     return raw === '__none__' ? 'none' : null;
   }
   ```

2. **`src/hooks/useBills.ts`**
   - `BillLineData` (line 17): add `po_assignment?: 'none' | 'auto' | null`.
   - `updateBill` (line 1115): include `po_assignment` in the inserted line rows (already passed through `...line`, so no extra change once the field is on the type).
   - `updateApprovedBill` (line 956): add `po_assignment` to the `billLines` arg type and include it in the `bill_lines` UPDATE payload at line 988.

3. **`src/components/bills/EditBillDialog.tsx`**
   - Import `derivePoAssignment` from `@/utils/poSentinelUtils`.
   - At every place a bill line object is built (lines 388–411, 458–482, 499–518), add:
     ```ts
     po_assignment: derivePoAssignment(row.purchaseOrderId),
     ```

No DB migration (`po_assignment` already exists on `bill_lines`). No change to the matcher, the badge component, or query invalidation. No other components touched.

### Result

Picking "No purchase order" and clicking Save Changes writes `po_assignment = 'none'`. The PO matcher then skips that line and the badge updates to "No PO" on the next render of the table.
