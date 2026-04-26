I found the core issue: the database is now corrected, but the Enter with ML table is showing stale local React state until the Edit Extracted Bill dialog closes and forces a line refetch. That is why simply opening/closing the dialog makes the table change from `2000: SOFT COSTS` to `2030/2050` without you editing anything.

There is a second issue: the PO Status matcher is still largely header-cost-code based, so it can show `No PO` even when pending bill lines have valid `purchase_order_id` / `purchase_order_line_id` links.

Plan:

1. Make the initial Enter with ML load use authoritative PO line cost codes immediately
   - In `BillsApprovalTabs.tsx`, update the initial PO auto-match step so when it finds a PO line match, it always overwrites the local line's cost code/name from the matched PO line.
   - This removes the current bug where it only inherits the PO cost code when the bill line has no cost code.

2. Refresh local table rows after server-side PO snap/rematch
   - Keep the existing `rematch-pending-bill` call, but after it returns any snap/sync result, refetch that bill's `pending_bill_lines` with lot joins and push them into `batchBills`.
   - This makes the table update as soon as the background sync finishes, without needing to open the Edit Extracted Bill dialog.
   - Also make the parent `handleLinesUpdate` invalidate the PO matching query so PO Status recomputes immediately.

3. Fix PO Status to recognize explicit pending PO links
   - In `useBillPOMatching.ts`, include POs from `purchase_order_id` and also from `purchase_order_line_id`.
   - Fetch `purchase_order_lines` for linked line IDs and use their `purchase_order_id` and `cost_code_id` as authoritative.
   - When a pending line is linked to a PO line, treat it as matched even if the PO header `cost_code_id` is different or null.

4. Ensure PO summary/dialog totals remain line-aware
   - Update the matching calculation so current bill amounts allocated to a PO include lines whose `purchase_order_line_id` belongs to that PO.
   - This keeps the PO badge, row click behavior, and PO summary dialog aligned with the Edit Extracted Bill dialog.

5. Add a one-time safety repair for existing extracted bills if needed
   - Add a migration or repair step that syncs any remaining `pending_bill_lines.cost_code_id/cost_code_name` from linked `purchase_order_lines`.
   - This is idempotent and protects bills already uploaded before the UI refresh fix.

Technical details:

```text
Current behavior:
Extraction/rematch updates DB -> table keeps old batchBills state -> dialog close refetches lines -> table suddenly corrects

New behavior:
Extraction/rematch updates DB -> Enter with ML refetches affected lines immediately -> table + edit dialog + PO status all show the same PO-line-backed values
```

Files to update:
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/hooks/useBillPOMatching.ts`
- optional migration/repair SQL for existing pending lines