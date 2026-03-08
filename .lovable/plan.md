
Goal: make grouped payment rows (chevron row + expanded child rows) exactly the same height as the standard bill rows (the first two rows), with zero visual variance.

Plan

1) Lock a single row-height class and apply it to every bill row type
- In `src/components/bills/BillsApprovalTable.tsx`, create one shared constant for row height (e.g. `const BILL_ROW_CLASS = "h-11"`).
- Apply it to:
  - `renderBillRow` (`<TableRow key={bill.id}>`)
  - payment header row (`key=payment-${paymentId}`)
  - child allocation row (`key=alloc-${paymentId}-${alloc.billId}`)
- Keep existing hover/selection behavior by combining with current row classes (not replacing base classes).

2) Remove “content-dependent height” behavior in grouped rows
- Keep grouped rows visually blank where needed, but stop relying on hidden placeholder controls to set height.
- Replace any height-anchor hacks (`opacity-0 pointer-events-none` buttons) with simple placeholders, since row height will now be explicitly controlled at row level.
- Ensure grouped-row cells still use the same width/truncate classes as standard rows so layout remains identical.

3) Normalize vertical alignment for chevron/vendor content
- In the chevron vendor cell, wrap icon + text in a fixed inline container (e.g. `inline-flex items-center h-6 gap-1`) so icon/text baseline does not make the row look shorter.
- Apply the same vertical centering approach to child “Bill/Credit Memo” label cell.

4) Keep all row content single-line and non-expanding
- Ensure grouped-row text remains `block truncate` (already mostly done) so no wrapped content can change effective height.
- Preserve `table-fixed` behavior and existing column widths.

5) Validation checklist (after implementation)
- Paid tab:
  - Compare standard rows (250895 / OCH-02302) vs chevron rows vs expanded child rows.
  - Confirm all have identical pixel height in collapsed and expanded states.
  - Confirm no regressions in truncation, tooltip behavior, and column alignment.
- If a 1px mismatch remains, apply the same shared row class to any remaining fallback/empty rows in this table section so every rendered `<TableRow>` in Paid view uses the identical height contract.
