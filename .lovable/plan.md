
Make the Cost Code tooltip in `PayBillsTable.tsx` (Approved tab) match the flat layout already used by Enter with AI, Review, Rejected, and Paid.

## What changes

The Approved tab currently renders the Cost Code tooltip as a grouped list (cost code header, then an indented `Lot N: $amount` row underneath). Every other tab — Enter with AI, Review, Rejected, Paid — uses a flat layout: one row per bill line with `cost code | $amount`, then a `Total:` row.

The fix:
- Replace the grouped cost-code-with-indented-lot layout in `PayBillsTable.tsx` with the flat `name | amount` layout used by `BillsApprovalTable.tsx` and `BatchBillReviewTable.tsx`.
- Drop `lotName` from the breakdown rows in the Cost Code tooltip on the Approved tab. Lot/address info still has its own separate Address column tooltip and is unaffected.
- Each saved bill line becomes one row in the tooltip. Lines without a visible cost code or account name fall back to `No Cost Code` / `No Account` so the tooltip total always equals the bill total.
- Final row is `Total: $X.XX`.

## File to update

`src/components/bills/PayBillsTable.tsx`
- `getCostCodeOrAccountData`: change `lineBreakdown` items from `{ costCode, lotName, amount }` to `{ name, amount }`, with deterministic fallbacks for missing names. Sum from saved lines.
- Cost Code `TableCell` render: replace the cost-code header + indented lot row with the same flat block used in `BillsApprovalTable.tsx`:
  ```
  name                              $amount
  name                              $amount
  ─────────────────────────────────────────
  Total:                            $total
  ```

No changes to `BillsApprovalTable.tsx`, `BatchBillReviewTable.tsx`, the Address tooltip, or any other column.

## Verification

1. Approved tab → hover Cost Code on a multi-line bill: flat list of `code: name | $amount` rows + `Total:` row, identical visual style to Enter with AI.
2. Review, Rejected, Paid, Enter with AI tabs: unchanged (already flat).
3. Address column tooltip on Approved tab: unchanged (still groups by cost code with lot rows).
4. Tooltip total always equals the row's Amount.
