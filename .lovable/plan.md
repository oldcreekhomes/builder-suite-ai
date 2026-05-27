# Accountant dashboard: jump straight to Manage Bills

## Problem
On the Accountant dashboard's Active Jobs table, clicking the **Current**, **Late**, **Rejected**, or **Pay** badge currently follows the row's click handler to `/project/{id}` (project dashboard). The accountant then has to click "Manage Bills" to actually act on the alert — a redundant step.

## Change
Make each of those four badge cells navigate directly to Manage Bills for that project, pre-selecting the relevant tab. The rest of the row (Address, Accounting Manager, dates, etc.) continues to navigate to the project dashboard as today.

## Tab mapping
Based on `useBillCountsByProject`:

| Column   | Source bills                       | Target tab on Manage Bills |
|----------|------------------------------------|----------------------------|
| Current  | draft bills, not past due          | `review`                   |
| Late     | draft bills, past due              | `review`                   |
| Rejected | void bills                         | `rejected`                 |
| Pay      | posted bills (ready to pay)        | `approve`                  |

Route: `/project/{projectId}/accounting/bills/approve?tab={tab}` — `BillsApprovalTabs` already reads `tab` from the query string, so no changes needed there.

## Implementation
In `src/components/accountant-dashboard/AccountantJobsTable.tsx`, for each of the four `<TableCell>` blocks (Current / Late / Rejected / Pay):
- When the count is `> 0`, wrap the badge in a button-like element with `onClick={(e) => { e.stopPropagation(); navigate(...); }}`, `cursor-pointer`, and a subtle hover effect.
- When the count is `0` (currently shows `-`), keep current behavior so the row click still works.
- A small helper inside the component (e.g. `goToBills(projectId, tab)`) keeps the four cells tidy.

## Out of scope
- Late column does not get a due-date filter pre-applied. (The `review` tab already shows both current and late draft bills together; adding a filter is a separate request if you want it.)
- No changes to row-click behavior, totals row, or any other column.
- No changes to `BillsApprovalTabs` or routing config.

## Acceptance
- Clicking a non-zero Current / Late / Rejected / Pay badge on the Accountant dashboard opens Manage Bills for that project on the correct tab in a single click.
- Clicking the `-` placeholder still navigates to the project dashboard (row default).
- Clicking anywhere else on the row still navigates to the project dashboard.
