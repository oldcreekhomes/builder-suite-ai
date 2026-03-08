
Goal: make every row in the Paid table exactly the same height as the standard bill rows (the first two rows), including payment header rows (chevron rows) and expanded child rows.

Diagnosis
- The grouped payment rows are shorter because they do not include the same “tall” cell content as standard rows.
- Standard rows always render a Notes button (`Button` with `h-6 w-6`) in the Notes column, which sets the effective row height.
- Group header/child rows currently render plain “-” text in Notes (and simpler content in other utility cells), so those rows collapse to a smaller height.

Implementation plan (`src/components/bills/BillsApprovalTable.tsx`)
1. Create a shared “row height anchor” cell content pattern
- Add a tiny helper (local function/component) used only in grouped rows, e.g. `renderNotesHeightAnchor()`.
- It should render the same button shell dimensions as standard rows:
  - `Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 pointer-events-none"`
- This preserves exact row height without adding visible UI noise.

2. Apply that anchor to grouped payment header rows
- In the payment header row block (the `payment-${paymentId}` row), replace the current Notes cell `"-"` with the same-height hidden button anchor.
- Keep visible behavior unchanged (still appears visually empty / “-” semantics), but dimensions match normal rows.

3. Apply the same anchor to expanded child rows
- In each child allocation row (`alloc-${paymentId}-${alloc.billId}`), replace the Notes cell `"-"` with the same-height hidden anchor.
- This ensures chevron-expanded rows are the same height as all other rows.

4. Normalize any remaining grouped-only compact cells
- Keep widths/classes identical to standard row classes (`w-*`, `max-w-*`, `text-center`).
- Do not use custom row height classes (`h-[41px]` etc.); rely on identical content structure to guarantee exact parity.

5. Optional hardening (if needed after preview check)
- If any 1px variance remains due to icon/button combinations, add a single shared row class for all bill rows (standard + grouped + child), but only as a fallback.
- Preferred approach remains structural parity (same internal control heights), not hardcoded pixel row heights.

Validation checklist
- Paid tab: compare row heights of:
  1) normal bill rows (250895 / OCH-02302),
  2) chevron payment header row,
  3) each expanded child row.
- Confirm they are visually identical across collapsed and expanded states.
- Confirm no regressions in hover, truncation, tooltips, and column alignment.
