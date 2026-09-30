# Add Manager to Cash Position

## Changes
- Add a **Manager** column between **Job** and **Bank Account**.
- Match each Cash Position row to its project’s assigned accounting manager.
- Display the same centered gray initials badge used in Active Jobs, with the full name on hover.
- Show a dash when no accounting manager is assigned.
- Rebalance column widths while keeping all financial columns left-aligned and legible.

## Technical details
- Reuse the existing project data and accounting-manager mapping already used by the accountant dashboard.
- Keep Cash Position calculations and bank-account selection unchanged.
- Verify the updated table in the accountant Cash Position tab and confirm the preview remains error-free.
