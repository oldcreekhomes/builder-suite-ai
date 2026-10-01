# Remove Cash Position from Owner Dashboard

Cash Position stays only on the Accountant dashboard (its own tab). The Owner dashboard goes back to yesterday's layout.

## Change

`src/pages/Index.tsx` — owner branch:

- Remove `CashPositionCard` from the right-hand column (currently below Multiple Project Entries).
- Restore the owner layout to: Active Jobs table (left) with Multiple Project Entries (right sidebar), followed by Employee Activity — exactly as it was before the Cash Position card was added.
- Keep the `CashPositionCard` import and the Accountant dashboard's Cash Position tab untouched.

## Verification

- `bun run build:dev` passes.
- Owner dashboard renders with no Cash Position card; Accountant dashboard's Cash Position tab unchanged.
