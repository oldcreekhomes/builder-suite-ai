
## Fix: Sort PO Summary by PO Number + Fix Missing Data in Review/Paid Tabs

### Problem 1: PO Summary not sorted
The matches in the PO Summary dialog appear in arbitrary order. They should be sorted by PO number.

### Problem 2: Review/Paid tabs show wrong "This Bill" in detail view
The BillsApprovalTable and PayBillsTable queries do NOT fetch `purchase_order_line_id` or `memo` from `bill_lines`. Without these fields, the PODetailsDialog can't disambiguate which PO line a bill amount belongs to -- so the cost-code fallback causes incorrect allocation (e.g., $720 appearing on "Billed To Date" as $720 and "This Bill" as $720, showing -$720 remaining).

The Enter with AI tab works because BatchBillReviewTable constructs these fields from the pending bill state.

### Changes

**1. `src/components/bills/BillPOSummaryDialog.tsx` -- Sort matches by PO number**

Sort the `matches` array by `po_number` before rendering the table rows.

**2. `src/components/bills/BillsApprovalTable.tsx` -- Add missing fields to query and interface**

- Add `purchase_order_line_id` to the Supabase `bill_lines` select query (line 253-274)
- Add `purchase_order_line_id` to the `BillForApproval` interface's `bill_lines` array type (line 69-90)

**3. `src/components/bills/PayBillsTable.tsx` -- Add missing fields to all 3 queries**

- Add `purchase_order_line_id` and `memo` to all three Supabase `bill_lines` select queries (there are 3 separate queries in this file)
- Update the bill interface to include these fields

### Files Changed
- `src/components/bills/BillPOSummaryDialog.tsx` (sort matches)
- `src/components/bills/BillsApprovalTable.tsx` (add `purchase_order_line_id` to query + interface)
- `src/components/bills/PayBillsTable.tsx` (add `purchase_order_line_id` + `memo` to queries + interface)
