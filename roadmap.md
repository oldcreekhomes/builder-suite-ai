# Roadmap

## In progress
- [ ] Multiple Checks: entered-order summary, complete file saving with safe retry, wider cost code, corrected alignment
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
- [ ] Green Landscaping MSG527 — how/when was it actually paid?
- [ ] Airtron at 1 East Custis — resend HVAC package invite or upload proposal
