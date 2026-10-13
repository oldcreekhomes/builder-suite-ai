# Match Cash Position to the application cards

## Changes
- Update the single shared Cash Position card so both Accountant and Project Manager dashboards receive the same typography changes.
- Match My Projects and Accounting Alerts: keep the title at `text-lg font-semibold`, use their standard card foreground, and match the title icon size and header spacing.
- Use `text-sm font-normal` for project names and ordinary values, removing the extra weight currently applied to Cash Position job names and individual net balances. Keep the totals row distinct.
- Replace the undersized day selector and refresh control overrides with the application's standard control sizing and text weight.
- Leave the other cards unchanged. Preserve columns, currency precision, positive/negative indicators, search, day options, calculations, and Accounting Manager filtering.

## Technical scope
Make the presentation changes in `src/components/owner-dashboard/CashPositionCard.tsx` only, reusing the existing shadcn Card and controls. No duplicated dashboard-specific typography, global style changes, or accounting/data changes.

## Verification
- Compare the Cash Position title and project text against My Projects and Accounting Alerts.
- Check both dashboard placements, including the half-width Project Manager card, for readable text and aligned controls.
- Run the existing Cash Position scope tests to confirm filtering and totals remain unchanged, and check the preview for errors.
- If authenticated preview access remains unavailable, explicitly report that visual verification limitation.