# Compact Cash Position

## Changes
- Tighten Cash Position job rows to match the spacing of Accounting Alerts, retaining the current font size and clear two-decimal amounts.
- Hide the Manager header, row cells, and footer cell **only on the Project Manager dashboard**. Keep Manager on the Accountant dashboard.
- On Project Manager, remove the forced 900px table width and redistribute the five remaining columns so Job, Bank Account, Bank Balance, Approved Bills, and Total fit within the half-screen card at the supplied desktop size without horizontal scrolling. Use truncation with full-text tooltips for long job and account names, not clipped amounts.
- Delete “Approved bills include anything already past due.” from both Cash Position locations.
- Keep the shared implementation, search, day selector, calculations, manager-specific filtering, and other dashboard cards unchanged.

## Technical details
Update the shared `CashPositionCard.tsx`, using its existing dashboard scope for the Manager column and compact column widths. Adjust header/body/footer alignment and loading/empty-state column spans together. Override the standard row height locally for this requested compact table, without changing global table defaults.

## Verification
- Compare job row spacing against Accounting Alerts.
- At the supplied 1587 × 873 desktop size, confirm the Project Manager card shows all five columns, including Total, without horizontal scrolling.
- Confirm the Accountant table still shows Manager and both tables omit the note.
- Run existing Cash Position tests and check preview errors; report any authenticated visual-verification limitation rather than claiming a signed-in check.