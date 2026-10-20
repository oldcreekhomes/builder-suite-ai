# Roadmap

## In progress
- [x] Reconciliation Review: vendor credits on payments counted permanently (saved payment totals; clearing tags credit side; past months backfilled; OW Nov–Mar match statements; 3 tests passed)
- [x] Cash Position: search box hidden on PM dashboard only, accountant keeps it (shared component conditional; build OK; signed-in visual verification unavailable with external auth)
- [x] Accountant dashboard Active Jobs rows tightened to Cash Position density via shared `.table-compact` (build OK; rendered rows measured 33px vs 45px before; Cash Position rows unchanged at 32px; signed-in visual verification unavailable with external auth)
- [x] Compact shared Cash Position rows, hide Manager only on PM, fit five PM columns, and remove explanatory note (7 tests passed; build OK; signed-in visual verification unavailable with external auth)
- [x] Shared Cash Position on PM dashboard: Accounting Manager filtering, equal top panels, half-width alerts/cash, remove Recent Photos, keep forecast (7 tests passed; build OK; authenticated visual verification unavailable with external auth)
- [x] Multiple Checks: entered-order summary, checked file saving with safe retry, wider cost code, corrected alignment (6 tests passed; signed-in verification unavailable)
- [x] Multiple Checks: cents on blur and all entry fields in saved summary (build and allocation tests passed; signed-in verification unavailable with external auth)
- [x] Cash Position card below Multiple Project Entries (Owner + Accountant dashboards)
  - [x] Card UI: Active Amount | Approved Bills (10/15/20 days) | Total (green/red)
  - [x] Balance sourced from the bank account ledger (default bank preselected, dropdown to switch)
- [ ] Plaid live balance feed (waiting on Plaid approval)
  - [ ] Connection storage table + RLS
  - [ ] Edge functions: plaid-link-token, plaid-exchange-token, plaid-refresh-balance
  - [ ] Switch Column 1 from book balance to live bank balance

- [x] Enter Multiple Checks: full width, file attachments, lot split divider, draft saved across navigation
- [x] Enter Multiple Checks: one visible row per split check with lot-count hover breakdown (grouping/math tests passed; signed-in UI verification unavailable with external auth)

## Open (blocked on user)
- [x] Restore confirmed identical PDF for all six Oct 12 batch checks and protect shared file references from deletion (six attachments verified; three deletion-safety tests passed; signed-in preview unavailable)
- [ ] Green Landscaping MSG527 — how/when was it actually paid?
- [ ] Airtron at 1 East Custis — resend HVAC package invite or upload proposal
