The saved database row for the Kempsville bill is correct: `purchase_order_id = null` and `po_assignment = 'none'`. The bug is in the UI read path: the Edit Bill dialog loads `purchase_order_id` only, so a saved explicit “No PO” comes back as blank, and the dropdown converts blank into “Auto-match” whenever vendor POs exist. That can also let matching UI show “Matched” from stale cache until the relevant queries refresh.

Plan:
1. Update `EditBillDialog` row hydration so `po_assignment = 'none'` is translated back to the `__none__` UI sentinel for both job cost and expense lines.
   - This makes the reopened dialog show “No purchase order,” not “Auto-match by cost code.”
2. Add a small shared helper in `poSentinelUtils` for the reverse mapping, so save/read behavior stays symmetrical.
   - Save: `__none__` → `po_assignment = 'none'`, `purchase_order_id = null`.
   - Read: `po_assignment = 'none'` → `purchaseOrderId = '__none__'`.
3. Tighten query refresh after saving a bill so the Manage Bills table and PO matching cache update immediately.
   - Keep invalidating `bills-for-approval-v3`, `bill`, and `bill-po-matching`.
   - Ensure the active bill query refetches with fresh line fields before the next dialog open.
4. Verify against the actual Kempsville row and UI logic:
   - Database remains `po_assignment = 'none'`.
   - Table PO Status resolves to `No PO`.
   - Edit Bill dialog reopens with “No purchase order.”