# Roadmap

## In progress
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
