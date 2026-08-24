# Seed the first Atlantic Union Bank reconciliation at Nob Hill

Data-only change. No code edits.

## Current state (verified)

- Nob Hill has two bank accounts: 1010 Atlantic Union Bank and 1015 Capital One.
- Atlantic Union has never been reconciled. The only record for it is a stale, abandoned in-progress reconciliation dated 05/31/2026 with a beginning balance of 0, an ending balance of 607.14, no transactions checked, and a difference of -607.14.
- Capital One has its own completed history (April, May, July) plus one in-progress August statement — none of that is touched.
- The Beginning Balance field is filled from the prior completed reconciliation for the same account, which is why Atlantic Union opens at 0 today.

## What I'll do

1. Delete the stale 05/31/2026 in-progress Atlantic Union record (it has no checked transactions, so nothing is lost).
2. Insert one completed "opening" reconciliation for Atlantic Union at Nob Hill dated 03/31/2026, beginning and ending balance $28,208.67, difference $0, no transactions checked, noted as the QuickBooks-to-BuilderSuite opening balance.

Result: opening Reconcile Accounts for 1010 Atlantic Union Bank at Nob Hill starts a fresh 04/30/2026 statement with a Beginning Balance of $28,208.67, and that April statement becomes the first real reconciliation for the account.

## Notes

- No journal entry is created, so the Balance Sheet is unchanged. Say the word if you also want a ledger entry to book the $28,208.67 opening balance.
