# 6119 11th Street — 1010 Atlantic Union Bank: which number is right?

## Answer: the Balance Sheet ($0.00) is correct

Verified directly against the ledger for project `6119 11th Street N` and account `1010 - Atlantic Union Bank`, project-scoped, excluding reversals and reversed entries:

| Flow | Amount |
| --- | --- |
| Deposits in (15 live deposits) | $93,198.10 |
| Bill payments out (31) | ($92,858.19) |
| Checks out (2) | ($239.18) |
| Manual JE 06/01/2026 "Move money to Capital One" | ($100.73) |
| **Net** | **$0.00** |

Every live deposit journal line matches a live row in the deposits table, and there are no duplicate journal entries for any payment on this account. So the account genuinely nets to zero, and the register's ($4,950.00) ending balance is a display defect, not real money.

## Data defect found along the way

Twelve October 2025 deposits at this project were reversed. Eight originals were flagged correctly (`reversed_at` + `reversed_by_id`), but **four originals totaling $24,000 have `reversed_by_id` set and `reversed_at` left NULL**. Their reversing entries exist and are correct. Any report that keys only on `reversed_at` (rather than also on `reversed_by_id`) will double-count these $24,000 of deposits. The Balance Sheet and the account register both filter on `reversed_by_id`, so both are safe today — but other screens may not be.

## The plan

1. **Reproduce the register's row list** for this account/project as of 09/03/2026 and print each row with its running balance, to pin down exactly which row(s) create the ($4,950.00) drift. The query behind the register nets to $0.00, so the drift is introduced when journal lines are turned into display rows (deposit / bill-payment / check row assembly in `AccountDetailDialog.tsx`) — the exact row must be identified before changing anything.
2. **Fix that row-assembly bug** so the register's running balance ends at $0.00 and matches the Balance Sheet. Presentation-layer only; no ledger amounts changed.
3. **Repair the four half-flagged reversals** at this project by setting `reversed_at` on the four originals from their reversing entries' dates, so both flags agree and no other report can double-count them. Ledger totals do not move — these entries are already excluded everywhere today.
4. **Audit for the same half-flagged pattern** elsewhere and report the count back before touching any other project's data.

## Technical notes

- Project `a50ae540-913d-481f-8e9f-72b64fa5a362`, account `27ed0c3a-be95-4367-aa21-1a2b51ea1585`.
- Balance Sheet filter (`BalanceSheetContent.tsx`) and register filter (`AccountDetailDialog.tsx`) are identical: `is_reversal = false`, `reversed_by_id is null`, `reversed_at` null-or-after-as-of, `entry_date <= as-of`, `project_id = <project>`. Both return $0.00 for this account, which is why the drift is downstream of the query.
- Step 3 is a scoped `UPDATE public.journal_entries` (and the matching `deposits` rows if they show the same gap) limited to the four entry IDs at this project.

## Verification

Re-open 1010 from the Balance Sheet at 6119 11th Street and confirm the register's last running balance reads $0.00 and equals the Balance Sheet line. Confirm the project's Balance Sheet still balances (Assets = Liabilities + Equity) and that no other project's numbers move.
