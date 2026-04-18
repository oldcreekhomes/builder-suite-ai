
Problem rephrased:
The hover is correct because it reads the extracted invoice lines directly. The PO dialog is still wrong because it rebuilds allocations from a different data source, and that source does not even contain the three target POs for this bill.

Do I know what the issue is?
Yes.

What I found:
- Bill `C26019` extraction is correct:
  - `2025-923T-0035` → `20350`
  - `2025-923T-0036` → `2800`
  - `2025-923T-0027` → `4030`
- `pending_bill_lines` also now carry the correct `po_reference` values for all 3 lines.
- The real break is in the dialog PO source:
  - `BillPOSummaryDialog` and `PODetailsDialog` depend on `useVendorPurchaseOrders(...)`
  - `useVendorPurchaseOrders` only loads `project_purchase_orders` where `status = 'approved'`
- But the three exact POs for this bill are currently `status = 'rejected'`:
  - `2025-923T-0027`
  - `2025-923T-0035`
  - `2025-923T-0036`
- So the dialog never has those PO records available.
  - That means `po_reference` cannot resolve to the real PO
  - Siding still works via unique cost-code fallback
  - The two `4400` lines stay at `$0.00` because the strict ambiguity guard blocks guessing

Why the mismatch happens:
- Row/hover matching path can still identify the correct PO numbers.
- Dialog detail path fetches a different PO dataset and silently excludes the needed records by status.
- So the dialog and hover are still using different truths.

Implementation plan:
1. Make the PO dialog fetch the exact matched POs, not just approved POs
- Update `useVendorPurchaseOrders.ts` to support an optional override such as:
  - `includePoIds?: string[]`
  - or `statuses?: string[]`
- For dialog usage, fetch:
  - the matched PO ids explicitly
  - even if their status is not `approved`
- Keep existing default behavior for dropdowns/manual-entry screens that should still show only normal approved POs.

2. Wire the summary/details dialogs to pass matched PO ids into that hook
- In `BillPOSummaryDialog.tsx`, call `useVendorPurchaseOrders` with `matches.map(m => m.po_id)`.
- This guarantees `vendorPOs` contains:
  - `0027`
  - `0035`
  - `0036`
- Then the existing `po_reference` resolution logic can finally map each pending line to the correct PO.

3. Keep the strict allocation rules, but let them operate on the real PO list
- Leave the current resolution order in place:
  1. `purchase_order_line_id`
  2. `purchase_order_id`
  3. `po_reference`
  4. unique cost-code fallback
- Once the actual matched POs are loaded, `getThisBillAmount` and the drill-down `pendingBillLines` filter should naturally produce:
  - `0027` → `$4,030.00`
  - `0035` → `$20,350.00`
  - `0036` → `$2,800.00`

4. Fix Enter with AI auto-match so persistence can also use explicit PO numbers even when PO status is not approved
- In `BillsApprovalTabs.tsx`, keep the fuzzy fallback on approved POs if desired, but add a first-pass lookup by printed `po_reference` against exact PO numbers regardless of status.
- Persist `purchase_order_id` and `purchase_order_line_id` when that exact printed-reference match is found.
- This prevents the queue from re-opening with null PO ids for bills like this one.

5. Verify other tabs stay stable
- `BillsApprovalTable` and `PayBillsTable` already pass full bill objects; they should keep working.
- The change should be scoped so only the PO dialogs can load non-approved matched POs when needed.

Files to update:
- `src/hooks/useVendorPurchaseOrders.ts`
- `src/components/bills/BillPOSummaryDialog.tsx`
- `src/components/bills/PODetailsDialog.tsx`
- `src/components/bills/BillsApprovalTabs.tsx`

Expected result after implementation:
- PO Status Summary for `C26019` shows:
  - `2025-923T-0027` → This Bill `$4,030.00`
  - `2025-923T-0035` → This Bill `$20,350.00`
  - `2025-923T-0036` → This Bill `$2,800.00`
- Total “This Bill” = `$27,180.00`
- Clicking each row opens the correct line-level detail
- Refreshing the queue keeps the same result

Technical note:
This is not an OCR problem and not primarily a line-allocation bug anymore. The dialog is missing the exact PO records because its PO query filters them out by status. Once the dialog is given the same matched PO set the hover already proves, the existing `po_reference` logic should finally work.
