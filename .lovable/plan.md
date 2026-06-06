## Add PO Info to Transaction Details

Extend the Transaction Details dialog (used in account registers) so that for a Bill or Bill Pmt - Check row, the user can see the linked purchase order's number, total, and match status — the same "Matched / Over / Partial / No PO" badge that appears on the Manage Bills page.

### What changes for the user

For rows where `source_type` is `bill`, `bill_payment`, or `consolidated_bill_payment`, the dialog will show three new rows beneath the existing details (above the Cleared row):

- **PO Number** — e.g. `PO-1042` (or a comma-separated list if the bill touches multiple POs). Shows `-` when no PO is linked.
- **PO Amount** — total of the linked PO(s), formatted as currency. Shows `-` when none.
- **PO Status** — the same colored `POStatusBadge` already used on Manage Bills (Matched / Draw / Over / Partial / Numerous / No PO).

For non-bill rows (Check, Deposit, Credit Card, Journal Entry) nothing changes.

### How it will be wired up

Single file change: `src/components/accounting/TransactionDetailDialog.tsx`.

1. In the existing `useEffect` that already loads the underlying bill(s) for the dialog, also pull:
   - `bill_lines` rows for those bill IDs, including `purchase_order_id`, `purchase_order_line_id`, `po_reference`, `po_assignment`, `cost_code_id`, `amount`.
   - The parent `bills` rows already loaded supply `vendor_id`, `project_id`, `total_amount`.

2. Run those bills through the existing `useBillPOMatching` hook so the dialog uses the exact same matching/aggregation logic as Manage Bills (4-weight matcher, `overall_status`, `po_number`, `po_amount`). Wrapping the bills array in `useMemo` keyed on bill IDs keeps the query stable.

3. Derive display values from the hook result:
   - PO Number: `Array.from(new Set(matches.map(m => m.po_number))).join(', ')`.
   - PO Amount: sum of distinct PO `po_amount` values (dedupe by `po_id`).
   - PO Status: `overall_status` from the matcher; pass directly into `<POStatusBadge>`.
   - When there are no matches or all bills come back `no_po`, render `-` / `-` / `<POStatusBadge status="no_po" />`.

4. Render the three new rows inside the same `grid grid-cols-[120px_1fr]` block. The `PO Status` row renders the badge instead of plain text (handled with a small `isBadge` flag on the detail item or by inlining it before the Cleared row).

### Technical notes

- No DB schema or migration changes.
- No changes to mutation paths, lock logic, status pills, or reconciliation derivation.
- `useBillPOMatching` is already a React Query hook, so it will be called unconditionally at the top of `TransactionDetailDialog`; when the dialog is closed or the transaction is not a bill/bill payment, it receives an empty `bills` array and short-circuits.
- For `consolidated_bill_payment` rows the dialog already aggregates `billIds` from `bill_payment_allocations` + `includedBillPayments` — the PO lookup reuses that same set, so combined payments show every PO touched by every underlying bill.

### Out of scope

- Linking from the PO Number row to the PO detail dialog (can be added later if you want it clickable).
- Showing per-line PO breakdown inside the dialog — only the aggregate is shown.
