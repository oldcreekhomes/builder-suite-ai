

## Plan: Slim down Manual tab table

The Manual tab currently shows Cost Code + Description columns, which duplicates the "2310 - Public Housing Contributions" header already shown at the top of the Budget Details dialog. This forces the modal to span full width.

### Changes (`src/components/budget/BudgetDetailsModal.tsx`)

1. **Remove redundant columns** from the Manual tab table:
   - Drop the "Cost Code" column (header + cell).
   - Drop the "Description" column (header + cell).
   - Remaining columns: Notes, Unit Price, Unit, Quantity, Total, Actions.

2. **Keep persistence intact**: continue saving `description = costCode.name` and `cost_code_id` on each row — only the visible columns are removed, not the underlying data.

3. **Shrink the dialog width**: change `DialogContent` from its current wide class (e.g. `max-w-6xl`/`max-w-5xl`) to `max-w-3xl` so the modal no longer spans the full screen. Keep responsive padding.

4. **Column sizing tweaks** so the slimmer table looks balanced:
   - Notes: flexible (takes remaining space)
   - Unit Price: ~`w-32`
   - Unit: `w-16` centered (unchanged)
   - Quantity: ~`w-24`
   - Total: ~`w-32` left-aligned (unchanged)
   - Actions: `w-12` centered (unchanged)

### Out of scope
- No changes to other tabs (Estimate, PO, Vendor Bid, Historical, Actual) — they keep their current layout.
- No DB or save-logic changes.
- No changes to Allocation Mode panel or Total Budget footer.

### Validation
1. Open Budget Details → Manual tab: table starts with Notes column; Cost Code / Description columns are gone.
2. Dialog is noticeably narrower (no longer full-screen width).
3. Apply still saves correctly; reopening shows the same notes / unit price / unit / quantity values.
4. Cost code identity still visible via the "2310 - Public Housing Contributions" subheader at the top of the dialog.

