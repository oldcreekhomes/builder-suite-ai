

## Suppress PO Status Summary when paying a bill

### Problem
Clicking **Pay Bill** on an approved bill opens the **Pay Bill** dialog and *also* auto-opens the **PO Status Summary** dialog on top of it. The PO Status Summary should only appear from its own trigger (the PO Status badge in the table), not as a side effect of starting a payment.

### Fix
In `src/components/bills/PayBillsTable.tsx` (and/or wherever the Pay Bill action is wired on the Approved tab), stop triggering the PO summary dialog when the Pay Bill flow opens. Concretely:

1. Locate the Pay Bill click handler / `onClick` for the row's "Pay Bill" menu item.
2. Remove (or guard) the call that sets `poDialogState.open = true` / opens `BillPOSummaryDialog` as part of that flow.
3. Ensure the PO Status Summary dialog remains reachable only via the explicit **PO Status** badge click in the table row.
4. Verify the Pay Bill dialog itself opens unchanged.

### Verification
- On Approved tab, row actions → **Pay Bill**: only the **Pay Bill** dialog appears. No PO Status Summary behind/above it.
- Clicking the **PO Status** badge ("Matched", "Draw", etc.) in the row still opens the **PO Status Summary** as today.
- Bulk pay / single-PO bills behavior unchanged.
- No data, hook, or other-component changes.

### Files touched
- `src/components/bills/PayBillsTable.tsx` only (plus the small wiring file if the Pay action is dispatched from a sibling, e.g. `BillsApprovalTabs` — to be confirmed during implementation; scope stays within the Approved-tab payment trigger).

