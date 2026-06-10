## Issue

In the **PO Status Summary** dialog opened from the regular **Edit Bill** dialog, the `Lots` column shows `—` for every row. Reason: the `EditBillDialog` Supabase query selects `bill_lines (*)` but does not join `project_lots`, so `project_lots` is `null` on every line and `LotsCell` renders the em-dash fallback.

The dialog already knows how to render lots correctly — `BillsApprovalTable` joins `project_lots!bill_lines_lot_id_fkey` and lots display properly there. `EditExtractedBillDialog` already builds the lot object locally too. Only `EditBillDialog` is missing it.

## Change

In `src/components/bills/EditBillDialog.tsx`, update the bill query so each `bill_lines` row also pulls its lot:

```diff
bill_lines (
  *,
  cost_codes (code, name),
- accounts (code, name)
+ accounts (code, name),
+ project_lots!bill_lines_lot_id_fkey ( lot_name, lot_number )
),
```

No other change. The existing `poSummaryBill` mapper already forwards `lot_id` and `project_lots` into the shared `BillPOSummaryDialog`, so once the join returns lot data the `LotsCell` will render real lot names (single name, or `+N` with hover breakdown when multiple).

## Scope

- One file: `src/components/bills/EditBillDialog.tsx`.
- No changes to the shared dialog, matching logic, save behavior, or other consumers.
