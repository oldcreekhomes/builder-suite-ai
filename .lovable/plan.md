## Goal
On the Manage Bills → Paid tab only, add two new columns to the right of Reference:
1. **Paid On** — payment date
2. **Paid By** — first + last initial avatar chip (same style as the PO table's Created By)

Other tabs (Draft, Review, Rejected, Approved) remain unchanged.

## Changes (single file: `src/components/bills/BillsApprovalTable.tsx`)

1. **Payment fetch** (around line 437): extend the `bill_payments` select to include `created_by`. After loading, batch-fetch matching `users` rows (`id, first_name, last_name`) and build a `Map<userId, {initials, fullName}>`.

2. **Payment group shape**: add `createdBy: string | null` and `createdByInitials: string | null` / `createdByName` to the `paymentGroupsMap` group type (line 421, 501, 522) and to the `MergedGroup` type (line 1525). Populate from the payment row; when merging non-primary groups, keep the primary's values.

3. **Header row** (after line 1490, Reference `<TableHead>`): when `isPaidStatus`, render two additional `<TableHead className="w-20">Paid On</TableHead>` and `<TableHead className="w-16 text-center">Paid By</TableHead>`.

4. **Paid parent row** (after the Reference `<TableCell>` around line 1705): when `isPaidStatus`, render:
   - Paid On cell with `formatDisplayFromAny(group.paymentDate)`
   - Paid By cell containing a small avatar circle showing the initials (reuse the same avatar component/pattern used in `PurchaseOrdersTable` "Created By" column — I'll match that visual: `h-7 w-7 rounded-full bg-muted text-[11px] font-medium` with tooltip showing full name).

5. **Paid child rows** (allocation rows, ~line 1763+) and the empty-state colspan (`baseColCount`, line 885 comment): add two empty `<TableCell>`s and bump colspan by 2 when `isPaidStatus`, keeping column alignment.

6. **Non-paid tabs**: no changes — the two headers/cells are gated behind `isPaidStatus`.

## Technical notes
- Reuse the exact avatar pattern from `src/components/purchaseOrders/` (the "RZ" chip visible in the screenshot) so the two tables look identical.
- No schema changes: `bill_payments.created_by` and `bill_payments.payment_date` already exist.
- No changes to any other tab, mutation, or business logic.
