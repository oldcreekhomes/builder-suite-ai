

## Fix "This Bill" Column Missing on First Load — All Tabs

### Problem
The "This Bill" column is missing when first opening the PO dialog from the Review, Rejected, Approved, and Paid tabs. It only appears after a page refresh. 

Root cause: 106 out of 107 draft bill lines have `purchase_order_id = NULL` in the database. The approved/paid bills may also lack this field in some cases. The dialog filters pending bill lines by `purchase_order_id`, finds nothing, and hides the column.

The previous fix only addressed the "Enter with AI" tab (BatchBillReviewTable). The same enrichment logic is needed for all other tabs.

### Solution
Instead of fixing each tab individually, fix it once in `BillPOSummaryDialog.tsx` itself. This component already has access to `vendorPOs` (which contains PO line items with cost codes) and `matches` (which maps cost codes to PO IDs). 

When building `derivedPendingBillLines`, if a bill line has no `purchase_order_id`, infer it by:
1. Finding a matching PO from `matches` that shares the same `cost_code_id`
2. If no match by cost code, check `vendorPOs` line items for a cost code match

This mirrors exactly what `useBillPOMatching` does to detect PO matches in the first place.

### Files Changed
- `src/components/bills/BillPOSummaryDialog.tsx` — enrich `derivedPendingBillLines` with inferred `purchase_order_id` when it's missing, using the `matches` array and `vendorPOs` data

### Technical Detail

```text
Current flow (broken):
  bill_lines[].purchase_order_id = null/undefined
  --> derivedPendingBillLines has no purchase_order_id
  --> filter by po_id returns empty
  --> hasPending = false
  --> "This Bill" column hidden

Fixed flow:
  bill_lines[].purchase_order_id = null/undefined
  --> infer from matches (cost_code_id -> po_id) or vendorPOs
  --> derivedPendingBillLines has inferred purchase_order_id
  --> filter by po_id finds lines
  --> hasPending = true
  --> "This Bill" column visible
```

This single fix covers Review, Rejected, Approved, Paid, and even the Enter with AI tab (making the previous BatchBillReviewTable enrichment redundant but harmless).
