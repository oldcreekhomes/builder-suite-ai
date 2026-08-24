# One-off data fix: opening balance for John Marshall (1010) at 2401 N Potomac

No code changes. Confirmed in the database that 2401 N Potomac has no reconciliation records at all, which is why Beginning Balance shows a locked 0 — there is no prior period for it to carry forward from.

## What I'll do

Insert a single closed "opening" reconciliation record for account 1010 on 2401 N Potomac:

- Statement date: Mar 31, 2026
- Status: completed
- Beginning balance: 0.00
- Ending balance: 10,619.38
- No transactions marked cleared (it is a seed record only)

## Result

When you open Reconcile Accounts for 1010 - John Marshall at 2401 N Potomac, the Apr 30, 2026 statement will carry a Beginning Balance of $10,619.38, and you can enter the ending balance and reconcile normally. Nothing in the ledger, journal entries, or reports changes — this only seeds the reconciliation starting point.

## If it happens again

The underlying behavior is that the first-ever reconciliation on a project always opens at $0 with the field locked. If you hit this on other projects, the follow-up would be to unlock the Beginning Balance field for the first reconciliation only. Not doing that now.
