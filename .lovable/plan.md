
# Fix: PO Status Dialog Not Reflecting Updated PO Assignment

## Problem
When a user edits a bill and changes the Purchase Order assignment via the Edit Bill dialog, the PO Status badge and its Comparison Dialog still show the OLD PO data. This happens because:

1. The `useBillPOMatching` hook only matches POs by composite key (project_id + vendor_id + cost_code_id) and completely ignores the explicit `purchase_order_id` saved on bill lines
2. The bill_lines query in `BillsApprovalTable` and `PayBillsTable` does not fetch `purchase_order_id`
3. The `po-related-bills` cache is never invalidated after bill edits

## Fix (3 files)

### 1. `src/hooks/useBillPOMatching.ts`
- Add `purchase_order_id` to the `BillLine` interface
- Update the matching logic to prioritize explicit `purchase_order_id` over cost-code matching:
  - If a bill line has a `purchase_order_id`, look up that specific PO directly instead of using the composite key
  - Fall back to cost-code matching only when no explicit PO is set (or when set to auto-match)

### 2. `src/components/bills/BillsApprovalTable.tsx`
- Add `purchase_order_id` to the bill_lines select query (line ~252)
- Pass `purchase_order_id` through the `billsForMatching` mapping (line ~303)

### 3. `src/components/bills/PayBillsTable.tsx`
- Same changes as BillsApprovalTable: add `purchase_order_id` to the bill_lines select query and pass it through to matching

### 4. `src/hooks/useBills.ts`
- Add `queryClient.invalidateQueries({ queryKey: ['po-related-bills'] })` to the `onSuccess` handlers for both `updateBill` and `updateApprovedBill` mutations

## Technical Detail

The matching logic change in `useBillPOMatching`:

```text
For each bill line:
  IF line.purchase_order_id exists AND is not '__auto__' or '__none__':
    -> Fetch that specific PO by ID and use it for the match
  ELSE IF line.purchase_order_id === '__none__':
    -> Skip (no PO match for this line)
  ELSE (auto-match or no purchase_order_id set):
    -> Use existing composite key logic (project_id + vendor_id + cost_code_id)
```

This ensures that when a user explicitly selects a PO in the Edit Bill dialog, the PO Status badge and Comparison Dialog reflect that choice immediately after saving.
