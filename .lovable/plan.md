
Goal: make the chevron payment rows and expanded detail rows exactly match the height of the normal rows (like 250895 / OCH-02302), with no visual variance.

Plan:
1) Fix the real source of mismatch in grouped rows
- In `src/components/bills/BillsApprovalTable.tsx`, update grouped payment header rows and grouped child rows so they include a proper height anchor in the far-right **Actions** cell (the one currently rendered empty when `canShowDeleteButton` is true).
- Standard rows have a real `TableRowActions` trigger (`h-8 w-8`), but grouped rows have an empty cell, which is why they still appear shorter.

2) Use explicit, column-matching hidden anchors (not generic placeholders)
- Add a small local helper for invisible anchors with exact target sizes:
  - `actions` anchor: `h-8 w-8` (to match `TableRowActions`)
  - `notes/utility` anchor: `h-6 w-6` (to match note/icon cells)
  - `pay-bill` anchor (if column shown): `h-7` button shell
- Replace grouped row empty utility/action cells with the correct anchor for that specific column.

3) Enforce row height at cell level for grouped rows
- Keep row class parity, but also add a shared grouped-cell class (`h-11 align-middle`) on grouped row `<TableCell>` entries so table layout cannot collapse shorter in any browser/table rendering case.
- Keep single-line `truncate` behavior intact.

4) Keep visual parity with standard rows
- Preserve same widths (`w-*`, `max-w-*`) and same typography sizing as standard rows.
- Keep chevron + vendor inline content centered (`flex items-center`) without introducing smaller text or compact spacing.

5) Validation pass after implementation
- Compare three row types in Paid tab:
  - normal rows,
  - chevron parent rows,
  - expanded child rows.
- Confirm identical pixel height in both collapsed and expanded states.
- Confirm no regression in truncation, tooltips, icons, and Actions column alignment.

Technical details:
- File: `src/components/bills/BillsApprovalTable.tsx`
- Key fix area: grouped row blocks around payment parent row and `alloc-*` child row rendering.
- Critical correction: do not leave grouped `canShowDeleteButton` cells empty; render hidden `h-8 w-8` action-size anchor to match standard row geometry exactly.
